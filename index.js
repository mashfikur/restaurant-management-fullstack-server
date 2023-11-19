const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const port = process.env.PORT || 5000;

// middlewares
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());

app.get("/", async (req, res) => {
  res.send(" Server is Running");
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rnoho8k.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // databse & collection
    const menuCollection = client.db("bistroBossDB").collection("menu");
    const cartCollection = client.db("bistroBossDB").collection("cart");
    const usersCollection = client.db("bistroBossDB").collection("users");

    // <------------api endpoints------------>

    // GET requests

    app.get("/api/v1/menu", async (req, res) => {
      const cursor = menuCollection.find();
      const result = await cursor.toArray();

      res.send(result);
    });

    app.get("/api/v1/user/get-cart/:id", async (req, res) => {
      const id = req.params.id;
      const query = { userId: id };
      const cursor = cartCollection.find(query);
      const cartItemsArray = await cursor.toArray();

      const itemIdArray = cartItemsArray.map((item) => item.itemId);

      const items = menuCollection.find({ _id: { $in: itemIdArray } });

      const result = await items.toArray();

      res.send(result);
    });

    // POST requests
    app.post("/api/v1/user/add-cart", async (req, res) => {
      const itemInfo = req.body;
      const result = await cartCollection.insertOne(itemInfo);
      res.send(result);
    });

    app.post("/api/v1/add-user", async (req, res) => {
      const userInfo = req.body;

      const existed = await usersCollection.findOne({ uid: userInfo.uid });

      if (!existed) {
        const result = await usersCollection.insertOne(userInfo);

        res.send(result);
      } else {
        res.send({ message: "User Alredy Listed" });
      }
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
