const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config();

const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());




const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jod42.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
console.log(uri)
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
// const client = new MongoClient(uri, {
//   serverApi: {
//     version: ServerApiVersion.v1,
//     strict: true,
//     deprecationErrors: true,
//   }
// });
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

    const blogCollection = client.db('dentalDB').collection('blogs');
    const wishlistCollection = client.db('dentalDB').collection('wishlist');


    blogCollection.createIndex({ title: "text" })


    app.get('/blogs',async(req,res) => {
      const email = req.query.email;
      const {category,search} = req.query;
      let query = {};
      if(email) {
        query.hr_email = email;
      }

      if(category) {
        query.category = category;
      }
      if(search){
        query.$text= {$search:search};
      }
      const cursor = blogCollection.find(query);
      const result = await cursor.toArray();
      res.send(result)
    })

    // app.get('/blogs', async(req,res) => {
    //   const {category,search} = req.query;
    //   let query = {};
    //   if(category) {
    //     query.category = category;
    //   }
    //   if(search){
    //     query.$text= {$search:search};
    //   }
    //   const result = await blogCollection.find(query)
    //   res.send(result)
    // })

    app.get('/recentBlogs',async(req,res) => {
      const cursor = blogCollection.find().sort({createdAt: -1}).limit(6);
      const result = await cursor.toArray();
      res.send(result);
    });


    // -------------Post a new blog:
    app.post('/blogs', async(req,res) => {
      const newBlog = req.body;
      const result = await blogCollection.insertOne(newBlog);
      res.send(result)
    });


    // -------------wishlist API's :
    

  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/' , (req,res) => {
    res.send('Patient is falling for sky')
});

app.listen(port,  () => {
    console.log(`Port is running successfully: ${port}`  )
})