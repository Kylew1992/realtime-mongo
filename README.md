# realtime-mongo

A way for you to manage your Mongo database in realtime

## Purpose

The purpose of realtime-mongo is to be able to create/edit/delete documents in your Mongo database whilst working outside the scope of existing application(s).

Pros
* Standalone Website for managing a Mongo database
* Built in User Authentication
* Traces the history of each record edited through the website
* Changes appear in real time thanks to web sockets

Cons
* Can only edit one field at a time
* Currently does not support mass inserts/updates
* May require furthur manipulation depending on how complicated your business logic is in existing application(s)

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
	* Force a column to use a subset of values
	* If the collection doesn't exist in Mongo, the server will automatically create it
	* If you decide to delete a collection.js file then the server will automatically delete the collection in Mongo (provided that the collection is empty)

## Front-end
1. User login
2. Global Refresh
	* Only visible for users with "Is Admin" = "Yes"
	* Clicking this button will force all clients to re-search
3. Each table has...
	* Editing - Click an editable cell to edit the value
		* While a user is editing, all refresh/re-search requests will be ignored until the user has cancelled or committed their edit
	* Filtering - Click the Filter icon and enter/choose a value to filter by
	* Paging - By default only 10 records are displayed at a time, this can be configured in your collection.js file
 	* Sorting - Click the column to sort
 	* Multi-sorting - Click the multi-sort button to open a dialog for configuring multiple sort levels
	* Truncating - If a cells content is too long, it will be truncated, clicking the cell will open a dialog with the full content
	* etc.

## Necessary Collections
* Change Log
	* This is the table shown on the Dashboard page
	* Documents inserts/updates/deactivates/deletes of all records edited through the realtime website
	* You can view the Change Log for a specific record by clicking the history icon
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
	* This collection records all of the errors thrown by the realtime Nodejs application (if any ;) )
	* So if an error were to be recorded, you could come to this screen and...
		1. See what the problem is by reviewing the message, stack trace, etc.
		2. Fix the problem
		3. Deactivate and Delete the "Error Log" record(s)

## Built With
### Core Components
* Bootstrap 3.3.7 (https://getbootstrap.com/docs/3.3/getting-started/)
* bootstrap-table (https://github.com/wenzhixin/bootstrap-table)
* jQuery (https://jquery.com/)
* MongoDB (https://www.mongodb.com/)
* Nodejs (https://nodejs.org/en/)
* Socket.IO (https://socket.io/)

### Additional Components
* bcrypt (https://www.npmjs.com/package/bcrypt)
* bootstrap-dialog (https://github.com/nakupanda/bootstrap3-dialog)
* bootstrap-select (https://github.com/silviomoreto/bootstrap-select)
* ejs (https://www.npmjs.com/package/ejs)
* express-session (https://www.npmjs.com/package/express-session)
* Inputmask (https://github.com/RobinHerbots/Inputmask)
* ipdata (https://ipdata.co/)
* momentjs (https://momentjs.com/)
* nodemailer (https://nodemailer.com)
* nodemon (https://nodemon.io/)

## Authors
Kyle Wertz (https://github.com/Kylew1992)

## License
This project is licensed under standard ISC License (https://spdx.org/licenses/ISC.html)