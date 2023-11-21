const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
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

// <---------Custom Middlewares------------>
const verfiyToken = (req, res, next) => {
  const token = req.headers.authorization.split(" ")[1];

  if (!token) {
    res.status(401).send({ message: "Unauthorized Access" });
    return;
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      res.status(403).send({ message: "Forbidden Access" });
      return;
    }

    console.log(decoded)
    req.decoded = decoded;
    next();
  });
};

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

    // ----------GET requests------------

    app.get("/api/v1/menu", async (req, res) => {
      const cursor = menuCollection.find();
      const result = await cursor.toArray();

      res.send(result);
    });

    app.get("/api/v1/user/get-cart/:id", verfiyToken, async (req, res) => {
      const id = req.params.id;
      const query = { userId: id };
      const cursor = cartCollection.find(query);
      const cartItemsArray = await cursor.toArray();

      const itemIdArray = cartItemsArray.map((item) => item.itemId);

      const items = menuCollection.find({ _id: { $in: itemIdArray } });

      const result = await items.toArray();

      res.send(result);
    });

    app.get("/api/v1/get-users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.get("/api/v1/user/check-admin/:id", async (req, res) => {
      const id = req.params.id;
      const query = { uid: id };
      const user = await usersCollection.findOne(query);

      if (user?.role === "admin") {
        res.send({ admin: true });
      } else {
        res.send({ admin: false });
      }
    });

    // ----------POST requests------------

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

    // creating jwt tokens
    app.post("/api/v1/auth/create-token", async (req, res) => {
      const { uid } = req.body;
      const token = jwt.sign({ uid }, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });

      res.send({ token });
    });

    //----------PATCH requests------------
    app.patch("/api/v1/user/make-admin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { uid: id };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };

      const result = await usersCollection.updateOne(
        filter,
        updateDoc,
        options
      );

      res.send(result);
    });

    // ----------DELETE requests------------
    app.delete("/api/v1/user/delete-item/:id", async (req, res) => {
      const id = req.params.id;
      const query = { itemId: id };
      const result = await cartCollection.deleteOne(query);
      res.send(result);
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
