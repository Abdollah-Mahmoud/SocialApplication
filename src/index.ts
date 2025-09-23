
import connectDB from "./db/db.connection";

import bootstrap from "./app.controller";

// Connect to DB first, then start server
const startApp = async () => {
  await connectDB();
  bootstrap();
};

startApp();
