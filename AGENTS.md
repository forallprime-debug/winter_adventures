# GitHub operations

Use gh-axi for GitHub operations in this project (repository info, pull requests, issues, Actions and releases). Invoke it with `./tools/gh-axi` from this repository. The wrapper uses the project-local installation and GitHub CLI in `.tools/`; it does not require global packages.

Use ordinary `git` for local Git operations such as status, diffs, branches and commits. gh-axi wraps the GitHub CLI rather than replacing Git.

If authentication is missing, ask the user to complete `.tools/bin/gh auth login --web`. Never put tokens in source files or chat messages.
