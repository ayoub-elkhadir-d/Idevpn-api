import("./server/dist/index.js").catch((error) => {
  console.error("Failed to load the compiled API application.", error);
  process.exitCode = 1;
});
