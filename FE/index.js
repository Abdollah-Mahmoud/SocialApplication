const clientIo = io("http://localhost:3000/");

clientIo.on("connect", () => {
  console.log(`Sever stablish connection successfully`);
});

clientIo.on("connect_error", (error) => {
  console.log(`Connection error :::: ${error.message}`);
});

clientIo.emit("sayHi", "Hello From FE to BE", (res) => {
  console.log({
    res,
  });
});
