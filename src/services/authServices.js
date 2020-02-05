const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const { PatientModel } = require("../models");
const { jwtSecret } = require("./../config");
const Logger = require("../loaders/logger");

module.exports = class AuthServices {
  constructor({ firstName, lastName, email, password } = {}) {
    this.firstName = firstName;
    this.lastName = lastName;
    this.email = email;
    this.password = password;
  }

  register(callback) {
    // // Form validation
    // //deconstruct errors from validateRegisterInput
    // const { errors, isValid } = validateRegisterInput(req.body); take this part to a middle ware
    // // Check validation
    // if (!isValid) {
    //   return res.status(400).json(errors);
    // }
    // find user by email
    Logger.debug("searching for a user with same email");
    PatientModel.findOne({ email: this.email })
      .then(patient => {
        if (patient) {
          Logger.error("a user with the same email exists 🔥");
          callback({ error: "Email already exists 🔥 " }, null);
        } else {
          Logger.debug("creating salt 😄");
          bcrypt.genSalt(10, (err, salt) => {
            if (err) {
              Logger.error("err with making salt 🔥");
              callback(err, null);
            }
            Logger.debug("hashing password 😄");
            bcrypt.hash(this.password, salt, (err, hash) => {
              //consider making a hashing middleware
              if (err) {
                Logger.error("err with hashing 🔥");
                callback(err, null);
              }
              Logger.debug("making new user 😄");
              const newPatient = new PatientModel({
                firstName: this.firstName,
                lastName: this.lastName,
                email: this.email,
                password: hash
              });
              Logger.debug("saving 😴");
              newPatient
                .save()
                .then(user => {
                  Logger.debug("done 😴");
                  callback(null, user);
                })
                .catch(err => {
                  Logger.error("err with saving user :fire:");
                  callback(err, null);
                });
            });
          });
        }
      })
      .catch(err => {
        Logger.error("err with find one user :fire:");
        callback(err, null);
      });
  }

  logIn(callback) {
    // Find user by email
    Logger.debug("searching for a patient 🔍");
    PatientModel.findOne({ email: this.email })
      .then(patient => {
        if (!patient) {
          Logger.error("no patiens with the same email 😖");
          callback({ emailnotfound: "Email not found ⛔️" }, null);
        }
        bcrypt
          .compare(this.password, patient.password)
          .then(isMatch => {
            if (isMatch) {
              Logger.debug("the passwords are a match 💓");
              Logger.debug("creating the token 🔑");
              jwt.sign(
                {
                  id: patient.id,
                  email: patient.email
                },
                jwtSecret,
                {
                  expiresIn: 31556926 // 1 year in seconds
                },
                (err, token) => {
                  if (err) {
                    Logger.error("err with the token eneration 💢");
                    callback({ "err with the token eneration 💢": err }, null);
                  }
                  Logger.debug(
                    "done creating the token sending back to the controller 🎮"
                  );
                  callback(null, {
                    success: true,
                    token: "Bearer " + token
                  });
                }
              );
            } else {
              Logger.debug("the passwords are not a match 💔");
              callback({ passwordincorrect: "Password incorrect 💢" }, null);
            }
          })
          .catch(err => {
            Logger.error("err with hashing 💢", err),
              callback({ "err with hashing 💢": err }, null);
          });
      })
      .catch(err => {
        Logger.error("err with searching for a patient 💢", err);
        callback({ "err with searching for a patient 💢": err }, null);
      });
  }
};
