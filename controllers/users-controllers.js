const { validationResult } = require('express-validator')
const bcryptjs = require('bcryptjs')
const jwt = require('jsonwebtoken')
const HttpError = require('../models/http-error')
const User = require('../models/user')

const getUsers = async(req, res, next) => {
    let users;
    try {
//We want to find certain fields only, Use 'email name' to include these or '--password' to exclude it
        users = await User.find({}, '--password')
    }
    catch {
        return next(new HttpError('Something went wrong. Try again later', 500))
    }

    //As already set in model, else users.map(u => u.toObject({getters: true}))
    res.json({users: users})
}

const signup = async(req, res, next) => {
    
    //Extracting from request body
    const { name, email, password } = req.body

    const errors = validationResult(req)
    if(!errors.isEmpty()){
        return next(new HttpError('Invalid Input Fields', 422))
    }

    let existingUser;
    //Check is already exist
    try {
        existingUser = await User.findOne({ email: email })
    }
    catch {
        return next(new HttpError('Something went wrong. Try again later', 500))
    }

    if(existingUser){
        return next(new HttpError('User already exist, login instead', 422))
    }

    let hashedPassword;
    try {
        hashedPassword = await bcryptjs.hash(password, 12)
    } 
    catch {
        return next(new HttpError('Something went wrong. Try again later', 500))
    }


    //Creating user with that data and storing, short for name: name is name
    const createUser = new User({
        name,
        email,
        password: hashedPassword,
        image: req.file.path,
        //Initially no places for a new user
        places: []
    })
    
try { 
    await createUser.save()
} 
catch {
    return next(new HttpError('Something went wrong. Try again later', 500))
}

let token;
try {
//First argument being payload of token, means data we can encode to token. This can be string, object or buffer. Next being the private key, only known by server, and nver by a client and last optional as configuration by token
token = jwt.sign({userId: createUser.id, email: createUser.email}, process.env.JWT_KEY, {
    expiresIn: '1h'
})
} 
catch {
return next(new HttpError('Something went wrong. Try again later', 500))
}

res.status(201).json({ userId: createUser.id, email: createUser.email, token: token })
}

const login = async(req, res, next) => {
    //Extracting from request body
    const { email, password } = req.body

    const errors = validationResult(req)
    if(!errors.isEmpty()){
        return next(new HttpError('Invalid Input Fields', 422))
    }

    //Find user existing with that email
    let identifiedUser;
    try {
        identifiedUser = await User.findOne({ email: email })
    }
    catch {
        return next(new HttpError('Something went wrong. Try again later', 500))
    }

    
    let isValidPassword = false;
    try{
        isValidPassword = bcryptjs.compare(identifiedUser.password, password)
    }
    catch{
        return next(new HttpError('Something went wrong. Try again later', 500))
    }

    //Either unexisting user or incorrect password
    if(!identifiedUser || !isValidPassword){
        return next(new HttpError('Invalid credentials. Please try again', 403))
    }

    let token;
try {
//Use private key for both signup and login, as if used diff. keys, diff. tokens would be generated. So, when client later sends token with a request, it wouldn't be validated on the server
token = jwt.sign({userId: identifiedUser.id, email: identifiedUser.email}, process.env.JWT_KEY, {
    expiresIn: '1h'
})
} 
catch {
return next(new HttpError('Something went wrong. Try again later', 500))
}

    //Send token as response so that client(react app) will be able to use and store this token and attach it to future requests to routes on backend that require backend. Now using this token, we could protect or routes from unauthorized access with certain backend logic; them only being accessible if request has token is attached to it
    res.json({ userId: identifiedUser.id, email: identifiedUser.email, token: token})
}

exports.getUsers = getUsers;
exports.signup = signup;
exports.login = login
