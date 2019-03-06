const  mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const _ = require('lodash');
const {validationResult} = require('express-validator/check'); // validating signup, login data

const User = require('../models/user'); 
const Exam = require('../models/exam'); 
//declearing global variables
const role = "member";
//writing the controllers
const signUpPage = (req,res,next)=>{
    let msg = req.flash('error');
        if (msg.length > 0){
            //console.log(req.flash('error')) 
            msg = msg[0];
        } else  {msg= null}
    res.status(200).render('auth/signup',{
        path: '/user/signup',
        errorMessage: msg,
        oldInput: {email: "", password: "", re_password: ""},
        invalidErrors: []
    });
}


const saveNewUser = (req,res,next)=>{
    const username = req.body.username;
    const email = req.body.email;
    const password = req.body.password;
    const gender = req.body.gender;
    const errors = validationResult(req);
    const role = 'member';
    
    if (!errors.isEmpty()){
        console.log(errors.array());
        return res.status(422).render('auth/signup',{
            path: '/user/signup',
            errorMessage: errors.array()[0].msg,
            oldInput: {email, password, retypePassword: req.body.retypePassword},
            invalidErrors: errors.array()
        });
    }

    bcrypt.hash(password,12)
        .then(hash=>{
            const user = new User({username,email,password:hash,gender,role});

            // create reusable transporter object using the default SMTP transport
            let transporter = nodemailer.createTransport({
                host: process.env.EMAIL_HOST,
                port: process.env.EMAIL_PORT,
                secure: process.env.IS_SECURE, // true for 465, false for other ports
                auth: {
                user: process.env.EMAIL_USER, // generated ethereal user
                pass: process.env.EMAIL_PASSWORD // generated ethereal password
                },
                tls: {
                    rejectUnauthorized: false
                }
            });

            // setup email data with unicode symbols
            let mailOptions = {
                from: `"No-reply" <${process.env.EMAIL_USER}>`, // sender address
                to: email, // list of receivers
                subject: "Thank you, " + username, // Subject line
                text: "Thank You for your registration to our site", // plain text body
            };
            // send mail with defined transport object
            transporter.sendMail(mailOptions,(error, info)=>{
                if(error){
                    console.log(error);
                }
            })

            // send mail with defined transport object
            transporter.sendMail(mailOptions,(error, info)=>{
                if(error){
                    console.log(error);
                }
            })

            //console.log("Message sent: %s", info.messageId);
            // Preview only available when sending through an Ethereal account
            //console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
            return user.save();
            
        }).then(isSaved=>{
            res.redirect('/user/login');
            console.log(isSaved);
        })
        .catch(err=>{
            console.log(err);
        })
}

const dBoardController = async(req,res,next)=>{
    userName = req.session.user.username;
    userId = req.session.user._id;
    
    const [profile] = await Exam.find({user: userId});
    if(!profile){
        res.status(200).render('user/dashboard',{
            path: '/user/dashboard',
            userName, 
            totalAvgScore: 0, 
            examTaken: 0, 
            highestMark: 0, 
            lowestMark: 0
        });
    }
    const totalAvgScore = Number(_.sum(_.map(profile.exams, 'averageScore')).toFixed(2));
    const examTaken = profile.exams.length;
    const highestMark = _.sortBy(profile.exams, 'averageScore')[0].averageScore.toFixed(2);
    const lowestMark = _.sortBy(profile.exams, 'averageScore').reverse()[0].averageScore.toFixed(2);


    res.status(200).render('user/dashboard',{
        path: '/user/dashboard',
        userName, totalAvgScore, examTaken, highestMark, lowestMark});
}

module.exports ={
    saveNewUser,
    signUpPage,
    dBoardController 
}