# Claude — read this first

This is a multi-month project. Persistent context across sessions is critical, and the user is **learning while building** — every concept and decision must be explained in depth.

## Read these at the start of every session

- **[SKILLS.md](SKILLS.md)** — source of truth: project goal, stack, decisions (with dates + reasoning), open questions
- **[docs/README.md](docs/README.md)** — index of the learning record; jump into specific `docs/NN-*.md` files when relevant to the current task

## When a meaningful decision is made

1. **Update [SKILLS.md](SKILLS.md)** — move items from "Open questions" to "Decisions made" with the date, or add new decision rows.
2. **Write or update a doc in [docs/](docs/)** if the decision is substantial enough that future-you would want the _why and how_ explained — follow the format in [docs/\_template.md](docs/_template.md): What / Why / How / Pros / Cons / Alternatives / What this means for our project.
3. **Update memory** if the decision implies a behavior to adopt going forward.

## Documentation discipline

Every meaningful concept, library choice, architectural pattern, or non-trivial implementation gets a doc in `docs/`. The user is using this project as a learning vehicle — explanations should teach the _tradeoff_, not just announce a choice. Bias toward writing more docs, not fewer; thin ones are fine.

Do not let context live only in chat history.
