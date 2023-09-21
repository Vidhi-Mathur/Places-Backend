const express = require('express')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const fs = require('fs')
const path = require('path')
const placesRoutes = require('./routes/places-routes')
const usersRoutes = require('./routes/users-routes')
const HttpError = require('./models/http-error')

const app = express()

//Parse any incoming request having json data and the reach next middlewares in line. Moves from top -> bottom
app.use(bodyParser.json())

app.use('/uploads/images', express.static(path.join('uploads', 'images')))

/* Resources on a server can only be requested by requests that are coming from the same server. So for backend running on localhost 5000, we can only request data from there from an app that also runs on local host 5000. But app runs on localhost 3000, hence being two totally different domains.
CORS is a security concept enforced by the browser, no problems with Postman. It's a frontend error (by the browser but must be fixed on backend), not a server side error as server has to attach certain headers to the responses it sends back to the client that basically allow the client to access the resources and then the browser automatically detects these headers to access them and the browser will not throw this error here.
So we need to attach the right headers to our response.*/
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET, POST, PUT, PATCH, DELETE')
    res.setHeader('Access-Control-Allow-Headers', '*' )
    next()
})

//Forward to placesRoutes only if request starts with /places
app.use('/places', placesRoutes)

//Forward to usersRoutes only if request starts with /users
app.use('/users', usersRoutes)

//Those coming after above routes are request basically that didn't got a response. 
app.use((req, res, next) => {
    throw new HttpError('Page not found', 404)
})

//To avoid code duplication for error handling each time as have to set header to 404 and send message each time. Middleware taking 4 arg. is treated by express as special middleware for error handling
app.use((error, req, res, next) => {
    //Link file to user in data. But rollback process in case of error
    if(req.file){
        fs.unlink(req.file.path, err => console.log(err))
    }

    //Headers set means already send a response
    if(res.headerSent){
        return next(error)
    }
    //Othewise set header and error msg
    res.status(error.code || 500).json({message: error.message || 'An unknown error occurred'})
})

//Connect to db
mongoose.connect(`mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.mjodwc6.mongodb.net/${process.env.DB_NAME}?authSource=admin&readPreference=primary`).then(() =>  app.listen(5000)).catch(err => console.log(err))
