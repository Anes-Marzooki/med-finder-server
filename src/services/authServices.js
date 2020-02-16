const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const { PatientModel, DoctorModel, PharmacyModel } = require("../models");
const { jwtSecret } = require("./../config");
const Logger = require("../loaders/logger");

module.exports = class AuthServices {
  constructor(
    type,
    {
      firstName,
      lastName,
      name,
      email,
      password,
      address,
      phoneNumber,
      speciality
    } = {}
  ) {
    this.type = type;
    this.firstName = firstName;
    this.lastName = lastName;
    this.name = name;
    this.email = email;
    this.password = password;
    this.address = address;
    this.phoneNumber = phoneNumber;
    this.speciality = speciality;
  }

  findModel() {
    switch (this.type) {
      case "patient":
        this.Model = PatientModel;
        break;
      case "pharmacy":
        this.Model = PharmacyModel;
        break;
      case "doctor":
        this.Model = DoctorModel;
        break;
    }
  }

  register(callback) {
    this.findModel();
    Logger.debug("searching for a user with same email");
    this.Model.findOne({ email: this.email })
      .then(user => {
        if (user) {
          Logger.error(`a ${this.type} with the same email exists 🔥`);
          return callback({ error: "Email already exists 🔥 " }, null);
        } else {
          Logger.debug("creating salt 😄");
          bcrypt.genSalt(10, (err, salt) => {
            if (err) {
              Logger.error("err with making salt 🔥");
              return callback(err, null);
            }
            Logger.debug("hashing password 😄");
            bcrypt.hash(this.password, salt, (err, hash) => {
              //consider making a hashing middleware
              if (err) {
                Logger.error("err with hashing 🔥");
                return callback(err, null);
              }
              Logger.debug("making new user 😄");
              const newUser = new this.Model({
                firstName: this.firstName,
                lastName: this.lastName,
                name: this.name,
                email: this.email,
                address: this.address,
                phoneNumber: this.phoneNumber,
                speciality: this.speciality,
                password: hash
              });
              Logger.debug("saving 😴");
              newUser
                .save()
                .then(user => {
                  Logger.debug("done 😴");
                  return callback(null, user);
                })
                .catch(err => {
                  Logger.error("err with saving user :fire:");
                  return callback(err, null);
                });
            });
          });
        }
      })
      .catch(err => {
        Logger.error("err with find one user :fire:");
        return callback(err, null);
      });
  }

  logIn(callback) {
    this.findModel();
    // Find user by email
    Logger.debug("searching for a patient 🔍");
    this.Model.findOne({ email: this.email })
      .then(user => {
        if (!user) {
          Logger.error("no patiens with the same email 😖");
          return callback({ emailnotfound: "Email not found ⛔️" }, null);
        }
        bcrypt
          .compare(this.password, user.password)
          .then(isMatch => {
            if (isMatch) {
              Logger.debug("the passwords are a match 💓");
              Logger.debug("creating the token 🔑");
              jwt.sign(
                {
                  id: user.id,
                  type: this.type,
                  email: user.email
                },
                jwtSecret,
                {
                  expiresIn: 31556926 // 1 year in seconds
                },
                (err, token) => {
                  if (err) {
                    Logger.error("err with the token eneration 💢");
                    return callback(
                      { "err with the token eneration 💢": err },
                      null
                    );
                  }
                  Logger.debug(
                    "done creating the token sending back to the controller 🎮"
                  );
                  return callback(null, {
                    // FIXME: added user obj to get the pharmacy id in /addMedicines
                    "user": user,
                    success: true,
                    "user type": this.type,
                    token: "Bearer " + token
                  });
                }
              );
            } else {
              Logger.debug("the passwords are not a match 💔");
              return callback(
                { passwordincorrect: "Password incorrect 💢" },
                null
              );
            }
          })
          .catch(err => {
            Logger.error("err with hashing 💢", err);
            return callback({ "err with hashing 💢": err }, null);
          });
      })
      .catch(err => {
        Logger.error("err with searching for a patient 💢", err);
        return callback({ "err with searching for a patient 💢": err }, null);
      });
  }
};
