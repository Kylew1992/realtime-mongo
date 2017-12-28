# realtime-mongo

A way for you to manage your Mongo database, in realtime, on a standalone website

## Server Prerequisites

```
MongoDB
Nodejs
```

## Installation
### With Git
1. Create a new folder for hosting realtime-mongo
2. Git Clone "https://github.com/Kylew1992/realtime-mongo.git"

### With Node Package Manager
1. Create a new folder for hosting realtime-mongo
2. Run "npm install realtime-mongo"
3. Open node_modules
    * Cut the realtime-mongo folder 
    * Move to your root folder
    * Move the files and folders inside realtime-mongo to your root folder
    * Delete the realtime-mongo folder

## Server Configuration 
1. Open the config.json file 
    * Put in your MongoDB url (including your database name)
        * The default database is "Realtime"
    * Put in your email service provider, email address and password
        * This will be used for user prompted password resets
2. Start your Mongo server
    * On Windows? You can run StartMongoServer.bat 
        * Configure this as necessary so that the correct paths/database are used
3. Start your node server
    * For development run StartNodeMonServer.bat to start realtime-mongo via nodemon
    * For production run StartNodeServer.bat
    * By default the server starts on port 8000, this can be configured in server/app.js
4. Open a browser and go to localhost:8000 or whichever port you specified in server/app.js
    * You should be prompted with a login screen
    * The default username and password is "ADMIN"
    * After logging in you will be forced to enter a new password
    * You can go to the User page to create/edit/deactivate/delete users
5. Add your collection definitions to "client/Realtime/Collections"
    * Define the columns/fields that you want to be visible on the page
    * Make your columns editable or read only
    * Specify a set of values for your column to use (combobox)
    * If the collection.js doesn't exist in Mongo, the server will create it
    * If you decide to delete a collection.js file then the server will automatically delete the collection (provided that the collection in Mongo is empty)

## Frontend
1. User login
2. Global Refresh
    * Only visible for users with "Is Admin" = "Yes"
    * Clicking this button will force all clients to re-search
3. Table has sorting, paging, filtering, etc.

## Necessary Collections
* Change Log
    * The Change Log is the table shown on the Dashboard page
    * The Change Log will document inserts/updates/deactivates/deletes of all records edited through the realtime website
    * To view the Change Log for a specific record you can simply click the history icon on the table
    * Deleted records will be stored in the Change Log along with the object's original JSON markup

* User
    * Only users with "Is Admin" = "Yes" will have access to this page
    * Create/edit/deactivate/delete users on this page
    * Assign emails to users so that they can reset their own password
    * Changing any field on the screen will force the user's browser to refresh in order to get the latest updates
    * Changing the "Password" field will force the user to re-login with the temporary password and will be promted to enter a new one
    * Changing the "Reset Session" field to "Yes" will force the user to log out

* Error Log
    * Only users with "Is Admin" = "Yes" will have access to this page
    * This collection records all of the errors thrown by the realtime Nodejs application (if any)
    * So if an error were to be recorded, you could come to this screen and...
        1. See what the problem is by reviewing the message, stack trace, etc.
        2. Fix the problem
        3. Deactivate and Delete the "Error Log" record(s)

## Built With
### Core Components
* MongoDB (https://www.mongodb.com/)
* Nodejs (https://nodejs.org/en/)
* Socket.IO (https://socket.io/)
* Bootstrap 3.3.7 (https://getbootstrap.com/docs/3.3/getting-started/)
* jQuery (https://jquery.com/)
* bootstrap-table (https://github.com/wenzhixin/bootstrap-table)

### Additional Libraries
* bootstrap-dialog (https://github.com/nakupanda/bootstrap3-dialog)
* bootstrap-select (https://github.com/silviomoreto/bootstrap-select)
* Inputmask (https://github.com/RobinHerbots/Inputmask)
* momentjs (https://momentjs.com/)

## Authors
Kyle Wertz (https://github.com/Kylew1992)

## License
This project is licensed under standard ISC License (https://spdx.org/licenses/ISC.html)