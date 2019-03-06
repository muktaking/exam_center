const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const {validationResult} = require('express-validator/check'); // validating signup, login data

//importing models
const User = require('../models/user');
//controllers to handle the get request for login
module.exports.getLogin = (req,res,next)=>{
    let msg = req.flash('error');
    if (msg.length > 0){ 
        msg = msg[0];
    } else  {msg= null}
    res.status(200).render('auth/login',{
        path: '/user/login', // a little bit confusing render file is in auth/login but web path is /user/login
        errorMessage: msg
    });
}

module.exports.postLogin = async (req,res,next)=>{
    const email = req.body.email;
    const password = req.body.password;
    try {
        const [user] = await User.find({email});
        console.log(user);
        if(!user){
            req.flash('error', 'Your are not registered'); // using flash to create a msg
            return res.redirect('/user/login');
        }
        //console.log(user[0].password);
        const isMatch = await bcrypt.compare(password, user.password);
        if(!isMatch){
            req.flash('error', 'Your password is wrong'); // using flash to create a msg
            return res.redirect('/user/login');
        }
        req.session.isLoggedIn = true;
        req.session.user = user;
        res.redirect('/user/dashboard');

    } catch (error) {
        console.log(error);
    }
    
}

module.exports.postLogOut = (req,res,next)=>{
    req.session.destroy(()=>{
        res.redirect('/');
    })
};

module.exports.postReset = (req,res,next)=>{

    crypto.randomBytes(32, (err, buffer)=>{
        if(err){
            console.log(err);
            return req.redirect('/user/login');
        }

        const token = buffer.toString('hex');
        User.findOne({email: req.body.email})
        .then( user=>{

            if(!user){
                return res.redirect('/'); // DO SOME RENDER PAGE
            }
            user.resetToken = token;
            user.resetTokenExpiration = Date.now() + (3*60*60*1000);
            user.save()
            .then(saved=>{
                res.redirect('/');
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
                    to: req.body.email, // list of receivers
                    subject: "Reset Your Password, ", // Subject line
                    html: `<h3>Reset Your Password</h3>
                            <p>If you request for password reset, click this <a href="http://localhost:3000/user/reset/${token}">link</a></p>
                    ` // html body
                };
                // send mail with defined transport object
                transporter.sendMail(mailOptions,(error, info)=>{
                    if(error){
                        console.log(error);
                    }
                    console.log(info);
                })
            })
            .catch(err=>{
                console.log(err);
            });
        }
        )
        .catch(err=>{
            console.log(err);
        });

    })
}

module.exports.getNewPassword = async(req, res, next)=>{
    const token = req.params.token;
    const user = await User.findOne({resetToken: token, resetTokenExpiration: {$gt: Date.now()}});
        
    if(user){
        let msg = req.flash('error');
        if (msg.length > 0){ 
            msg = msg[0];
        } else  {msg= null}

        res.render('auth/new-password',{
            errorMessage: msg,
            userId: user._id.toString(),
            passwordToken: token
        })
    }
    else{
        res.render('auth/new-password',{
            tokenErrorMessage: 'Token may be wrong or Token expired',
        });
    }
    
}

module.exports.postNewPassword = async(req, res, next)=>{
    const newPassword = req.body.password;
    const userId = req.body.userId;
    const passwordToken = req.body.passwordToken;
    const errors = validationResult(req);

    
    if (!errors.isEmpty()){
        console.log(errors.array());
        return res.status(422).render('auth/new-password',{
            errorMessage: errors.array()[0].msg,
            invalidErrors: errors.array(),
            userId: userId,
            passwordToken: passwordToken
        });
    }

    const user = await User.findOne({
        resetToken: passwordToken, 
        resetTokenExpiration: {$gt: Date.now()}, 
        _id: userId
    });

    if(user){
        const hashedPassword = await bcrypt.hash(newPassword, 12);
        user.password = hashedPassword;
        user.resetToken = null;
        user.resetTokenExpiration = undefined;
        await user.save();
        res.redirect('/user/login');
    }
    else{
        res.render('auth/new-password',{
            tokenErrorMessage: 'Token may be wrong or Token expired',
        })
    }
}