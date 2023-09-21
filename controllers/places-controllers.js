const { validationResult } = require('express-validator')
const mongoose = require('mongoose');
const fs = require('fs')
const HttpError = require('../models/http-error')
const getCoordinates = require('../util/location')
const Place = require('../models/place')
const User = require('../models/user');

//Can also be set as function getPlaceByPlaceId {...}, const getPlaceByPlaceId = function() {...}
const getPlaceByPlaceId = async(req, res, next) => {
    //Extracting from url
    const placeId = req.params.placeId
    let identifiedPlace;
    //Find one that matches with extracted one in database
    try {
        identifiedPlace = await Place.findById(placeId)
    } catch {
        return next(new HttpError('Something went wrong. Try again later', 500))
    }
    if(!identifiedPlace){
        return next(new HttpError('No place found', 404));
    }
    /*Convert Document object to plain Js object. getters set to tell mongoose to include virtual property to result
    res.json({ place: identifiedPlace.toObject({getters: true}) }). No need here as set in schema */
    res.json({ place: identifiedPlace })
} 


const getPlacesByUserId = async(req, res, next) => {
    //Extracting from url
    const userId = req.params.userId

    let identifiedPlace;
    try {
        //In model, stored as creator
        identifiedPlace = await Place.find({creator: userId})
    } catch {
        return next(new HttpError('Something went wrong. Try again later', 500))
    }
    

    if(!identifiedPlace){
        return next(new HttpError('No place found', 404))
    }
    /*Find returns an array[] of mongoose documents, so can't use toObject (converts mongoose document -> plain js object) with an array[], so we map against every place, converting each document to object and setting getters to true to retain all virtual properties
    res.json({ place: identifiedPlace.map(p => p.toObject({getters: true}))}). No need as set in model */
    res.json({places: identifiedPlace})
}


const createPlace = async(req, res, next) => {
//POST request have a request body, while GET don't have. So for POST request, we have to encode data into body we want to send
//To extract out of request body and store in constant
const { creator, title, description, address } = req.body;
//Stores errors as object if found in request object based on our validators. First extract then validate
const errors = validationResult(req)
if(!errors.isEmpty()){
    return next(new HttpError('Invalid Input Fields', 422))
}
let coordinates;
try {
    coordinates = await getCoordinates(address)
} catch(error) {
    return next(error)
}
const createPlace = new Place({ 
    //We'll enter as creator and coordinates but stored in PLACES[]/ db as creator and loaction, rest are same
    creator: creator, 
    image: req.file.path,
    title, 
    description, 
    address, 
    location: coordinates 
})

//Check if creator already exist to allow to create a new place
let existingUser;
try{
    existingUser = await User.findById(creator)
} catch {
    return next(new HttpError('Something went wrong. Try again later', 500))
}

if(!existingUser){
    return next(new HttpError('No user found', 404))
}

try { 
/*If user is exist, we can do two things now, store/create new place add the placeID to the corresponding user. To do that, we have to execute diff./ multiple operations undirectly related and if one of these operations fails independently from each other, then undo all operations, without changing anything in a document. 
To do that, we need to use transactions and sessions. The transaction allows you to perform multiple operations in isolation of each other and to undo this. And the transactions are basically built on sessions. To work with these transactions, we first have to start a session, then we can initiate the transaction and once the transaction is successful, the session is finished and the transactions are committed. 
So with that our place is created and the place is stored in our users document. */
    const newSession = await mongoose.startSession()
    newSession.startTransaction()
    //This session would automatically create a new placeId
    await createPlace.save({session: newSession})
    //method by mongoose to push createPlace to 'existingUser'
    existingUser.places.push(createPlace)
    await existingUser.save({session: newSession})
    await newSession.commitTransaction()
} catch {
    return next(new HttpError('Something went wrong. Try again later', 500))
}
res.status(200).json({ place: createPlace })
}


const updatePlace = async(req, res, next) => {
    //Extracting from url
    const placeId = req.params.placeId
    //Extracting updated data from request body
    const { title, description } = req.body;
    const errors = validationResult(req)
    if(!errors.isEmpty()){
        return next(new HttpError('Invalid Input Fields', 422))
    }
    let updatedPlace;
    try {
        updatedPlace = await Place.findById(placeId)
    } catch {
        return next(new HttpError('Something went wrong. Try again later', 500))
    }
    //Extracted from token. Compared to string as creator is of type mongoose objectId
    if(updatedPlace.creator.toString() !== req.userData.userId){
        return next(new HttpError('You are not allowed to edit this place', 401))
    }
    updatedPlace.title = title
    updatedPlace.description = description
    try {
        await updatedPlace.save()
    } catch {
        return next(new HttpError('Something went wrong. Try again later', 500))
    }
    //res.status(200).json({ place: updatedPlace.toObject({getters: true}) })
    res.status(200).json({ place: updatedPlace })
}

/* For deleting a place, need to remove from 'places' as well as from places[] storing its placeId in 'users'. So, we have to access a user document andoverwrite existing information there. Populate() allows us to refer to a document stored in another collection and to work with data in that existing document of that other collection.
For this we need a relation between these two documents. Populate() would work only if connection exists. Populate() needs one additional information about the document where we want to change something. In our case, this is the 'creator'*/
const deletePlace = async(req, res, next) => {
    //Extracting from url
    const placeId = req.params.placeId
    let removedPlace;
    try {
        //To avoid security leak
        removedPlace = await Place.findById(placeId).populate('creator', '-password -name -email')
        //No such place exist
        if(!removedPlace){
        return next(new HttpError('No place found', 404))
        }
        const imagePath = removedPlace.image
        fs.unlink(imagePath, err => console.log(err))
    } 
    catch {
        return next(new HttpError('Something went wrong. Try again later', 500))
    }
    
    //Called id as populate method adds id as string only
    if(removedPlace.creator.id !== req.userData.userId){
        return next(new HttpError('You are not allowed to delete this places', 401))
    }

    try { 
            const newSession = await mongoose.startSession()
            newSession.startTransaction()
            await removedPlace.deleteOne({session: newSession})
            //method by mongoose to remove placeId of removed place from user model
            removedPlace.creator.places.pull(removedPlace)
            await removedPlace.creator.save({session: newSession})
            await newSession.commitTransaction()
        } catch {
            return next(new HttpError('Something went wrong. Try again later', 500))
        }
    res.json({message: 'Deleted'})
}

//Not exported as a function, but as a pointer to let express execute it
exports.getPlaceByPlaceId = getPlaceByPlaceId
exports.deletePlace = deletePlace
exports.updatePlace= updatePlace
exports.getPlacesByUserId = getPlacesByUserId
exports.createPlace = createPlace