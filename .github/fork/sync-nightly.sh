#!/usr/bin/env bash
# Rebases the fork's own commits (upstream..main) onto upstream's newest
# published nightly. Branch `upstream` marks the nightly main was last based on.
#
# Remotes: `origin` is the fork, `upstream` is pingdotgg/t3code.
# In CI a conflict aborts the rebase and fails; locally it stops so you can
# resolve it (rerere remembers the resolution), `git rebase --continue`, then
# run the push command this script prints.
set -euo pipefail

UPSTREAM_REPO=pingdotgg/t3code

output() {
  echo "$1=$2"
  if [[ -n "${GITHUB_OUTPUT:-}" ]]; then echo "$1=$2" >>"$GITHUB_OUTPUT"; fi
}

tag=$(gh api "repos/$UPSTREAM_REPO/releases?per_page=50" --jq '
  [.[] | select(.prerelease and (.draft | not) and (.tag_name | test("-nightly\\.")))]
  | sort_by(.published_at) | last | .tag_name // empty')
if [[ -z "$tag" ]]; then
  echo "No published nightly release found on $UPSTREAM_REPO." >&2
  exit 1
fi

git fetch --quiet --no-tags upstream "refs/tags/$tag:refs/tags/$tag"
git fetch --quiet origin main upstream
nightly=$(git rev-list -n1 "$tag")
old_base=$(git rev-parse origin/upstream)
old_main=$(git rev-parse origin/main)

output tag "$tag"
output nightly "$nightly"
output old_main "$old_main"

if [[ "$nightly" == "$old_base" ]]; then
  echo "main is already based on $tag."
  output changed false
  exit 0
fi

echo "Rebasing $(git rev-list --count "$old_base..$old_main") fork commit(s) onto $tag."
git checkout --quiet -B main "$old_main"
if ! git rebase --onto "$nightly" "$old_base" main; then
  if [[ -n "${CI:-}" ]]; then
    git rebase --abort
    echo "Rebase onto $tag conflicts. Run .github/fork/sync-nightly.sh locally to resolve it." >&2
  else
    echo "Resolve the conflicts, run 'git rebase --continue', then:" >&2
    echo "  git push --atomic --force-with-lease=main:$old_main origin main $nightly:refs/heads/upstream" >&2
  fi
  exit 1
fi

output changed true
output candidate "$(git rev-parse HEAD)"
if [[ -z "${CI:-}" ]]; then
  echo "Rebased. Check it, then publish with:"
  echo "  git push --atomic --force-with-lease=main:$old_main origin main $nightly:refs/heads/upstream"
fi
