# Memory counter attachment – test prompt

Use this message to test the memory counter attachment end-to-end. The agent should display the counter in the chat using `<render_attachment id="..."/>` after creating or updating it.

---

**Step 1 – Add the counter and show it**

```
Add a memory counter attachment with key "test_counter", show it in the chat, and tell me its current value.
```

**Step 2 – Update by key (not attachment_update)**

```
Update the test_counter by one using the update_memory_counter tool (use key "test_counter", not attachment_id). Show the counter in the chat and explain that the in-memory value changed but the attachment will show stale until I resync.
```

**Step 3 – All-in-one**

```
Add a memory counter with key "clicks", display it in the chat, then increment it by 3 using update_memory_counter (key "clicks") and show the counter again.
```

---

## Short sanity check

```
Add a memory counter with key "demo", show it in the chat, then increment it by 1 using update_memory_counter with key "demo" and display the counter again.
```
