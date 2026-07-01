console.log("=== ENV KEYS ===");
Object.keys(process.env).sort().forEach(key => {
  console.log(`${key}: ${process.env[key] ? (process.env[key]!.length > 10 ? process.env[key]!.substring(0, 10) + "..." : process.env[key]) : "empty"}`);
});
