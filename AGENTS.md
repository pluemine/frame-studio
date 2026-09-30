# Frame Studio

Use TypeScript, Next.js and shadcn/ui. Keep rendering shared between web and CLI.
Keep documentation and UI copy in English. Support Thai and English frame text.
Use neutral generated demo artwork; never bundle company or campaign images.
Never select a page name or logo by default. Preserve native image dimensions
unless the user explicitly selects an output width.

Create feature branches from `dev`. Do not develop directly on `main` or `dev`.
Use `git merge --no-ff` when merging into `dev` or `main`; never fast-forward.
Use Conventional Commits: `feat(scope): imperative summary`.
Keep commit messages to one line and split changes by coherent feature or fix.
GitHub Pages is a repository site under `/frame-studio`; never edit the
`pluemine.github.io` repository or personal-site configuration for this project.
Before committing, run type checking, relevant tests and the production build.
Keep the README focused on setup, usage and deployment.
