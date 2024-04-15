const Post = require("../models/postModel");
const User = require("../models/userModel");
const path = require("path");
const fs = require("fs");
const { v4: uuid } = require("uuid");
const HttpError = require("../models/errorModel");
const { post } = require("../routes/postRoutes");

//* ========== CREATE POST ========== *//
//POST: api/posts
//PROTECTED
const createPost = async (req, res, next) => {
  // res.json("Create Post");
  try {
    let { title, category, description } = req.body;
    if (!title || !category || !description) {
      return next(new HttpError("All Fields are Required with Thumbnail", 422));
    }
    const { thumbnail } = req.files;
    //check file size
    if (thumbnail.size > 2000000) {
      return next(
        new HttpError("Thumbnail too big. File should be less than 2mb")
      );
    }
    let filename = thumbnail.name;
    let splittedfilename = filename.split(".");
    let newfilename =
      splittedfilename[0] +
      uuid() +
      "." +
      splittedfilename[splittedfilename.length - 1];
    thumbnail.mv(
      path.join(__dirname, "..", "/uploads", newfilename),
      async (err) => {
        if (err) {
          return next(HttpError(err));
        } else {
          const newPost = await Post.create({
            title,
            category,
            description,
            thumbnail: newfilename,
            creator: req.user.id,
          });
          if (!newPost) {
            return next(new HttpError("Post couldn't be created.", 422));
          }
          //find user and increase post count by 1
          const currentUser = await User.findById(req.user.id);
          const userPostCount = currentUser.posts + 1;
          await User.findByIdAndUpdate(req.user.id, { posts: userPostCount });

          res.status(201).json(newPost);
        }
      }
    );
  } catch (error) {
    return next(new HttpError(error));
  }
};

//* ========== GET ALL POSTS ========== *//
//GET: api/posts
//PROTECTED
const getPosts = async (req, res, next) => {
  // res.json("Get All Post");
  try {
    const posts = await Post.find().sort({ updatedAt: -1 });
    res.status(200).json(posts);
  } catch (error) {
    return next(new HttpError(error));
  }
};
//* ========== GET SINGLE POST ========== *//
//GET: api/posts/:id
//UNPROTECTED
const getPost = async (req, res, next) => {
  // res.json("Get Single Post");
  try {
    const postId = req.params.id;
    const post = await Post.findById(postId);
    if (!post) {
      return next(new HttpError("Post not found.", 404));
    }
    res.status(200).json(post);
  } catch (error) {
    return next(new HttpError("Post not found"));
  }
};
//* ========== GET POSTS BY CATEGORY ========== *//
//GET: api/posts/categories/:category
//PROTECTED
const getCatPosts = async (req, res, next) => {
  // res.json("Get Posts by Category");
  try {
    const { category } = req.params;
    const catPosts = await Post.find({ category }).sort({ createdAt: -1 });
    res.status(200).json(catPosts);
  } catch (error) {
    return next(new HttpError("Post not found"));
  }
};
//* ========== GET AUTOR POST ========== *//
//GET: api/posts/users/:id
//UNPROTECTED
const getUserPosts = async (req, res, next) => {
  // res.json("Get User Posts");
  try {
    const { id } = req.params;
    const posts = await Post.find({ creator: id }).sort({ createdAt: -1 });
    res.status(200).json(posts);
  } catch (error) {
    return next(new HttpError("User not found"));
  }
};

//* ========== EDIT POST ========== *//
//PATCH: api/posts/:id
//PROTECTED
const editPost = async (req, res, next) => {
  // res.json("Edit Posts");
  try {
    let fileName;
    let newFilename;
    let updatedPost;
    const postId = req.params.id;
    let { title, category, description } = req.body;

    if (!title || !category || description.length < 12) {
      return next(new HttpError("All fields are required.", 422));
    }
    // get old post from db
    const oldPost = await Post.findById(postId);
    if (req.user.id == oldPost.creator) {
      if (!req.files) {
        updatedPost = await Post.findByIdAndUpdate(
          postId,
          { title, category, description },
          { new: true }
        );
      } else {
        //delete old thumbnail
        fs.unlink(
          path.join(__dirname, "..", "uploads", oldPost.thumbnail),
          async (err) => {
            if (err) {
              return next(new HttpError(err));
            }
          }
        );

        //upload new thumbnail
        const { thumbnail } = req.files;
        //check file size
        if (thumbnail.size > 2000000) {
          return next(
            new HttpError("Thumbnail too big. should be less than 2mb")
          );
        }
        fileName = thumbnail.name;
        let splittedfilename = fileName.split(".");
        newFilename =
          splittedfilename[0] +
          uuid() +
          "." +
          splittedfilename[splittedfilename.length - 1];
        thumbnail.mv(
          path.join(__dirname, "..", "uploads", newFilename),
          async (err) => {
            if (err) {
              return next(new HttpError(err));
            }
          }
        );

        updatedPost = await Post.findByIdAndUpdate(
          postId,
          { title, category, description, thumbnail: newFilename },
          { new: true }
        );
      }
    }
    if (!updatedPost) {
      return next(new HttpError("Couldn't update post.", 400));
    }
    res.status(200).json(updatedPost);
  } catch (error) {
    return next(new HttpError("Post not found"));
  }
};
//* ========== DELETE POST ========== *//
//DELETE: api/posts/:id
//PROTECTED
const deletePost = async (req, res, next) => {
  // res.json("Delete Posts");
  try {
    const postId = req.params.id;
    if (!postId) {
      return next(new HttpError("Post unavailable.", 400));
    }
    const post = await Post.findById(postId);
    const fileName = post?.thumbnail;
    if (req.user.id == post.creator) {
      //delete thumbnail from upload folder
      fs.unlink(
        path.join(__dirname, "..", "uploads", fileName),
        async (err) => {
          if (err) {
            return next(new HttpError(err));
          } else {
            await Post.findByIdAndDelete(postId);
            //find user and reduce post count by 1
            const currentUser = await User.findById(req.user.id);
            const userPostCount = currentUser?.posts - 1;
            await User.findByIdAndUpdate(req.user.id, { posts: userPostCount });
            res.json(`Post ${postId} deleted successfully.`);
          }
        }
      );
    } else {
      return next(new HttpError("Post couldn't be deleted.", 403));
    }
  } catch (error) {
    return next(new HttpError(err));
  }
};

module.exports = {
  createPost,
  getPost,
  getPosts,
  getCatPosts,
  getUserPosts,
  editPost,
  deletePost,
};
