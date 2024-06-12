import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import axios from "axios";

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

const db = new pg.Client({
    user: "postgres",
    host: "localhost",
    database: "bookreviewdb",
    password: "Newgate@3",
    port: 5432,
});

db.connect();

let reviews = [
    { id: 1, book_title: "You Can Negotiate Anything", author_name: "Herb Cohen", read_date: "2023-08-02", rating: 10, cover_url: "https://covers.openlibrary.org/b/id/13878729-L.jpg", review: "Everything is negotiable. Challenge authority. You have the power in any situation. This is how to realize it and use it. A must-read classic from 1980 from a master negotiator. My notes here aren’t enough because the little book is filled with so many memorable stories — examples of great day-to-day moments of negotiation that will stick in your head for when you need them. (I especially loved the one about the power of the prisoner in solitary confinement.) So go buy and read the book. I’m giving it a 10/10 rating even though the second half of the book loses steam, because the first half is so crucial. "},
    { id: 2, book_title: "The Listening Book", author_name: "W.A. Mathieu", read_date: "2021-09-03", rating: 10, cover_url: "https://covers.openlibrary.org/b/id/13878729-L.jpg", review: "Everyone should read this book of little essays about listening. It teaches your ears to pay more attention. It calls your attention to sounds you hadn’t noticed. It’s beautifully written, and makes your life better. I read it twice, 24 years ago, and reading it again this week, it was even better than I remembered. "}
];

async function getReviews(){
    const result = await db.query("SELECT * FROM reviews ORDER by id ASC");
    return result.rows;
}

app.get("/", async (req, res) => {
    reviews = await getReviews();
    res.render("index.ejs", {
        listReview: reviews
    });
});

app.get("/new", (req, res) => {
    res.render("find.ejs", { heading: "New Review", submit: "Create Review" });
  });


//search book using https://openlibrary.org/search.json?title=you+can+negotiate+anything&author=herb+cohen
//fetch book cover image from openlibrary api
//use https://covers.openlibrary.org/b/$key/$value-$size.jpg
//where key ISBN, OCLC, LCCN, OLID and ID
//value is the value of the chosen key
//check each if it returns an image

app.post("/find", async (req, res) => {
    const title = req.body.title.toLowerCase().replace(/ /g,"+");
    const author = req.body.author.toLowerCase().replace(/ /g,"+");
    console.log(title + author);

    try {
        const response = await axios.get(
          `https://openlibrary.org/search.json?title=${title}&author=${author}&fields=key,title,author_name,cover_i&limit=1`
        );
        const result = response.data.docs[0];
        console.log(result);

        let coverURL = `https://covers.openlibrary.org/b/id/${result.cover_i}-L.jpg`;
        console.log("cover url: " + coverURL);

        res.render("modify.ejs", { 
            heading: "New Review", 
            submit: "Create Review",
            url: coverURL,
            title: result.title,
            author: result.author_name
         });
      } catch (error) {
        console.log("Book not found");
        console.log(error);
        res.render("find.ejs", { heading: "Book not found, please search again.", submit: "Create Review" });
    }
    
});

app.post("/reviews", async (req, res) => {
    const title = req.body.title;
    const author = req.body.author;
    const readDate = req.body.readDate;
    const rating = req.body.rating;
    const review = req.body.review;
    const url = req.body.coverURL;

    console.log(req.body);

    try{
        await db.query("INSERT INTO reviews (book_title,author_name,read_date,rating,cover_url,review) VALUES ($1,$2,$3,$4,$5,$6)",
        [title,author,readDate,rating,url,review]);
        res.redirect("/");
    } catch (err) {
        console.log(err);
    }
    //console.log(title,author,readDate,rating,review,url);


});

app.get("/edit/:id", async (req,res)=> {
    const id = parseInt(req.params.id);
    console.log(id);
    try{
        const result = await db.query("SELECT * FROM reviews WHERE id = $1", [id]);
        reviews = result.rows[0];
        const date = new Date(reviews.read_date).toISOString().slice(0,10);
        console.log(date);
        console.log(reviews);
        res.render("modify.ejs", { 
            heading: "Edit Review",
            submit: "Edit Review",
            editReview: reviews,
            date: date
        });
    } catch(err) {
        console.log(err);
    }
});

app.post("/edit/:id", async (req,res)=> {
    const readDate = req.body.readDate;
    const rating = req.body.rating;
    const review = req.body.review;
    const id = parseInt(req.params.id);

    console.log(readDate,rating,review);

    try{
        await db.query("UPDATE reviews SET read_date = $1, rating = $2, review = $3 WHERE id = $4",
        [readDate,rating,review,id]);
        res.redirect("/");
    } catch(err) {
        console.log(err);
    }
});

app.post("/delete/:id", async (req,res)=> {
    const id = parseInt(req.params.id);
    try{
        await db.query("DELETE FROM reviews where id = $1", [id]);
        res.redirect("/");
    } catch(err) {
        console.log(err);
    }
});


app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});