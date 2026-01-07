## Master Agent Workflow

### Backrgound info
* Bead List: Stored in .beads/issues.jsonl, managed via bd CLI
* Bead Selection: I should work on beads in priority order (P0 first), one at a time
* Completion Marking: Use bd update <id> --status done (or closed)
* Reset Mechanism: git reset --hard to the commit before the failed subagent's work
* JUDGE Subagent: A separate Task tool invocation to analyze failure modes
* Success Criteria: Tests passing + code verification (using mcp__imbue__verify)
* Retry Limit: Maximum 4 attempts per bead, then ask for human guidance

### Graphviz Workflow

```
digraph TaskDispatcher {
    rankdir=TB;
    node [shape=box, style=rounded];

    // Start
    START [label="START", shape=ellipse, style=filled, fillcolor=lightgreen];

    // Step 10
    READ_META [label="10. Read Meta Documentation\n(README.md, ARCHITECTURE.md,\n.beads/README.md)"];

    // Step 20
    LOOP_START [label="20. DO (Loop Start)", shape=diamond, style=filled, fillcolor=lightyellow];

    // Step 30
    PULL_BEAD [label="30. Pull First Open Bead\n(Priority Order: P0 → P3)"];
    DELEGATE [label="Delegate to Worker Subagent\n(Task tool: general-purpose)"];

    // Decision point
    CHECK_SUCCESS [label="Subagent\nSuccessful?", shape=diamond, style=filled, fillcolor=lightyellow];

    // Step 40 - Failure path
    CHECK_RETRIES [label="Retries < 4?", shape=diamond, style=filled, fillcolor=lightyellow];
    RESET_BEAD [label="40. Reset Bead State\n(git reset --hard)"];
    JUDGE [label="Launch JUDGE Subagent\n(Analyze Failure Mode)"];
    PROMPT_NEW_WORKER [label="Prompt Fresh Worker\n(Avoid Failure Mode)"];

    // Retry exhausted
    ASK_MERCY [label="45. Pause & Ask for\nForgiveness and Mercy", shape=box, style="filled,rounded", fillcolor=lightcoral];
    HUMAN_INPUT [label="Await Human Input", shape=ellipse, style=filled, fillcolor=lightblue];

    // Step 50 - Success path
    MARK_COMPLETE [label="50. Mark Bead Completed\n(bd update <id> --status done)"];

    // Check for more beads
    MORE_BEADS [label="More Open\nBeads?", shape=diamond, style=filled, fillcolor=lightyellow];

    // End
    END [label="END\n(All Beads Complete)", shape=ellipse, style=filled, fillcolor=lightgreen];

    // Edges
    START -> READ_META;
    READ_META -> LOOP_START;
    LOOP_START -> PULL_BEAD;
    PULL_BEAD -> DELEGATE;
    DELEGATE -> CHECK_SUCCESS;

    CHECK_SUCCESS -> MARK_COMPLETE [label="Yes"];
    CHECK_SUCCESS -> CHECK_RETRIES [label="No"];

    CHECK_RETRIES -> RESET_BEAD [label="Yes"];
    CHECK_RETRIES -> ASK_MERCY [label="No\n(4 failures)"];

    RESET_BEAD -> JUDGE;
    JUDGE -> PROMPT_NEW_WORKER;
    PROMPT_NEW_WORKER -> DELEGATE;

    ASK_MERCY -> HUMAN_INPUT;
    HUMAN_INPUT -> LOOP_START [label="Continue"];

    MARK_COMPLETE -> MORE_BEADS;
    MORE_BEADS -> LOOP_START [label="Yes"];
    MORE_BEADS -> END [label="No"];
}
```

### Key Operational Constraints (Confirmed)
* **Sequential Only**: One subagent at a time, one bead at a ti,me
* **Context Preservation**: I delegate object-level work to subagents, keeping my context clean
* **Autonomous Operation**: I work independently until I hit 4 failures or complete all beads
* **Atomic Commits**: Subagents produce atomic commits that pass all tests
