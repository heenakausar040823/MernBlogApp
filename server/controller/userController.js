const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const { v4: uuid } = require("uuid");

const User = require("../models/userModel");
const HttpError = require("../models/errorModel");

//* ========== REGISTER A NEW USER ========== *//
//POST: api/users/register
//UNPROTECTED
const registerUser = async (req, res, next) => {
  // res.json("register user");
  try {
    const { name, email, password, password2 } = req.body;
    if (!name || !email || !password) {
      return next(new HttpError("All Fields are required", 422));
    }

    const newEmail = email.toLowerCase();

    const emailExists = await User.findOne({ email: newEmail });
    if (emailExists) {
      return next(new HttpError("Email already exists.", 422));
    }

    if (password.trim().length < 6) {
      return next(new HttpError("Password should be atleast 6 characters"));
    }

    if (password != password2) {
      return next(new HttpError("Password do not match.", 422));
    }

    const salt = await bcryptjs.genSalt(10);
    const hashedPass = await bcryptjs.hash(password, salt);
    const newUser = await User.create({
      name,
      email: newEmail,
      password: hashedPass,
    });
    res.status(201).json(`New User ${newUser.email} registered.`);
  } catch (error) {
    return next(new HttpError("User Registration Failed", 422));
  }
};

//* ========== LOGIN A USER ========== *//
//POST: api/users/login
//UNPROTECTED
const loginUser = async (req, res, next) => {
  // res.json("login user");
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return next(new HttpError("All Fields are required", 422));
    }

    const newEmail = email.toLowerCase();

    const user = await User.findOne({ email: newEmail });
    if (!user) {
      return next(new HttpError("Invalid Credentials", 422));
    }

    const comparePass = await bcryptjs.compare(password, user.password);
    if (!comparePass) {
      return next(new HttpError("Invalid Credentials", 422));
    }

    const { _id: id, name } = user;
    const token = jwt.sign({ id, name }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });
    res.status(200).json({ token, id, name });
  } catch (error) {
    return next(
      new HttpError("Login Failed. Please Check Your Credentials", 422)
    );
  }
};

//* ========== USER PROFILE ========== *//
//POST: api/users/:id
//PROTECTED
const getUser = async (req, res, next) => {
  // res.json("User Profile");
  try {
    const { id } = req.params;
    const user = await User.findById(id).select("-password");
    if (!user) {
      return next(new HttpError("No User Found", 404));
    }
    res.status(200).json(user);
  } catch (error) {
    return next(new HttpError(error));
  }
};

//* ========== CHANGE USER AVATAR ========== *//
//POST: api/users/change-avatar
//PROTECTED
const changeAvatar = async (req, res, next) => {
  // res.json("Change user avatar");
  try {
    // res.json(req.files);
    // console.log(req.files);
    if (!req.files.avatar) {
      return next(new HttpError("Please choose an image.", 422));
    }
    //find user by id
    const user = await User.findById(req.user.id);

    //delete avatar if avatar exists
    if (user.avatar) {
      fs.unlink(path.join(__dirname, "..", "uploads", user.avatar), () => {
        if (err) {
          return next(new HttpError(err));
        }
      });
    }

    const { avatar } = req.files;
    //check file size
    if (avatar.size > 500000) {
      return next(
        new HttpError("Profile picture size should not exceed 500kb", 422)
      );
    }

    //rename the files
    let filename;
    filename = avatar.name;
    let splittedFilename = filename.split(".");
    let newFilename =
      splittedFilename[0] +
      uuid() +
      "." +
      splittedFilename[splittedFilename.length - 1];
    avatar.mv(
      path.join(__dirname, "..", "uploads", newFilename),
      async (err) => {
        if (err) {
          return next(new HttpError(err));
        }
        const updatedAvatar = await User.findByIdAndUpdate(
          req.user.id,
          { avatar: newFilename },
          { new: true }
        );
        if (!updatedAvatar) {
          return next(new HttpError("Avatar couldn't be change", 422));
        }
        res.status(200).json(updatedAvatar);
      }
    );
  } catch (error) {
    return next(new HttpError(error));
  }
};

//* ========== EDIT USER DETAILS ========== *//
//PATCH: api/users/edit-user
//PROTECTED
const editUser = async (req, res, next) => {
  // res.json("Edit User Profile");
  try {
    const { name, email, currentPassword, newPassword, newConfirmPassword } =
      req.body;
    if (!name || !email || !currentPassword || !newPassword) {
      return next(new HttpError("All Fields are Required.", 422));
    }

    //get user from db
    const user = await User.findById(req.user.id);
    if (!user) {
      return next(new HttpError("User not found.", 403));
    }

    //check new email already doesn't exist
    const emailExists = await User.findOne({ email });
    if (emailExists && emailExists._id != req.user.id) {
      return next(new HttpError("Email already exists.", 422));
    }

    //compare currentPassword to db password
    const validateUserPassword = await bcryptjs.compare(
      currentPassword,
      user.password
    );
    if (!validateUserPassword) {
      return next(new HttpError("Invalid Current Password.", 422));
    }

    //compare new passwords
    if (newPassword !== newConfirmPassword) {
      return next(new HttpError("New Passwords do not match.", 422));
    }

    //hash new password
    const salt = await bcryptjs.genSalt(10);
    const hash = await bcryptjs.hash(newPassword, salt);

    //update user info in db
    const newInfo = await User.findByIdAndUpdate(
      req.user.id,
      { name, email, password: hash },
      { new: true }
    );
    res.status(200).json(newInfo);
  } catch (error) {
    return next(new HttpError(error));
  }
};

//* ========== GET AUTHORS/USERS ========== *//
//POST: api/users/authors
//UNPROTECTED
const getAuthors = async (req, res, next) => {
  // res.json("get all users/authors");
  try {
    const authors = await User.find().select("-password");
    res.json(authors);
  } catch (error) {
    return next(new HttpError(error));
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUser,
  changeAvatar,
  editUser,
  getAuthors,
};
