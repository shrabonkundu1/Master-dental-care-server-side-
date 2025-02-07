const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const app = express();
require('dotenv').config();

const port = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://master-dental-care.web.app',
    'https://master-dental-care.firebaseapp.com'
    ],
  credentials: true
}))
app.use(express.json());
app.use(cookieParser())



const verifyToken = (req,res,next) => {
  const token  = req?.cookies?.token;

  if(!token) {
    return res.status(401).send({message: 'Unauthorized Access'})
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err,decoded) => {
    if(err){
      return res.status(401).send({message: 'Unauthorized Access'}) 
    }
    req.user  = decoded;
    next();

  })
}





const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jod42.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
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
    const commentCollection = client.db('dentalDB').collection('comments');


    blogCollection.createIndex({ title: "text" })


    // Implement JWT:
    app.post('/jwt', (req,res) => {
      const user = req.body;
      const token = jwt.sign(user,process.env.ACCESS_TOKEN_SECRET,{expiresIn: '5h'})
      res.cookie('token', token, {
        httpOnly:true,
        secure:  process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      })
      .send({success : true})
    })

    app.post('/logout', (req,res) => {
      res.clearCookie('token',{
        httpOnly:true,
        secure:  process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      })
      .send({success: true})
    })


    app.get('/blogs',verifyToken ,async(req,res) => {
      const email = req.query.email;
      const category = req.query.category;
      const search = req.query.search;
      let query = {};
      if(email) {
        query = {hr_email:email};
      }

      const cursor = blogCollection.find(query);
      const result = await cursor.toArray();
      res.send(result)
    })
    app.get('/allBlogs' ,async(req,res) => {
      const email = req.query.email;
      const category = req.query.category;
      const search = req.query.search;
      let query = {
        title : {
          $regex: search,
          $options:'i',
        }
      };
      if(email) {
        query = {hr_email:email};
      }
      

      if(category) {
        query.category = category;
      }
    
      const cursor = blogCollection.find(query);
      const result = await cursor.toArray();
      res.send(result)
    })


    // blog details
    app.get('/blogs/:id', async(req,res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await blogCollection.findOne(query);
      res.send(result);
    });


    app.get('/recentBlogs',async(req,res) => {
      const cursor = blogCollection.find().sort({createdAt: -1}).limit(6);
      const result = await cursor.toArray();
      res.send(result);
    });


    // -------------Post a new blog:
    app.post('/blogs',verifyToken, async(req,res) => {
      const newBlog = req.body;
      const result = await blogCollection.insertOne(newBlog);
      res.send(result)
    });


    // -------------wishlist API's :
    app.post('/myWishlist', async(req,res) => {
      const newWishlist  = req.body;
      const result = await wishlistCollection.insertOne(newWishlist);
      res.send(result);
    });

  //  
  

    app.get('/myWishlist' ,verifyToken, async(req,res) => {
      const email = req.query.email;
      let query = {};
      if(email){
        query = {hr_email:email}
      }
      if(req.user.email !== req.query.email){
        return res.status(403).send({message: 'Forbidden access'})
      }
      const cursor =  wishlistCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    })

    app.delete('/myWishlist/:id', async(req, res) => {
      const id = req.params.id;
      const query = {_id : new ObjectId(id)};
      const result = await wishlistCollection.deleteOne(query);
      res.send(result)
    });


    // _-------------Comments Apis
    app.post('/comments', async(req,res) => {
      const newComment = req.body;
      const result = await commentCollection.insertOne(newComment);
      res.send(result)
    });

    app.get('/comments/:id', async(req,res) => {
      const id = req.params.id;
      const query = {blog_id : id};
      const result = await commentCollection.find(query).toArray();
      res.send(result)
    });

    app.delete('/comments/:id', async(req,res) => {
      const id = req.params.id;
      const query= {_id : new ObjectId(id)};
      const result  = await commentCollection.deleteOne(query);
      res.send(result);
    });





    //  -----------Update BLOg
    app.put("/blogs/:id",async(req,res) => {
      const id = req.params.id;
      const query =  {_id: new ObjectId(id)};
      const option = {upsert: true};
      const updateBlogs = req.body;
      const blogs = {
        $set:{
          title : updateBlogs.title,
          blog_url : updateBlogs.blog_url,
          description : updateBlogs.description,
          category : updateBlogs.category,
          blogDeadline : updateBlogs.blogDeadline,
        }
      }
      const result = await blogCollection.updateOne(query,blogs,option);
      res.send(result)
    });

    app.get('/top_post',async(req,res) => {
      const cursor = blogCollection.aggregate([
        {
          $addFields: {
            wordCount: { $size: { $split: ["$description", " "] } } 
          }
        },
        { $sort: { wordCount: -1 } },
        { $limit: 10 }, 
        { $project: { wordCount: 0 } }
      ]);
        const result = await cursor.toArray();
      res.send(result);
    });

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