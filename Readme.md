npm package webix-data.
================================

Handling communication between [webix-mongo] (https://github.com/webix-hub/nodejs-mongo) or [webix-mysql] (https://github.com/webix-hub/nodejs-mysql) packages
and [webix-request] (https://github.com/webix-hub/nodejs-request), etc.

How to use
-----------

### Installation

```sh
npm install webix-data
```

### API

```js
//Init handler.
var webixData = require("webix-data"),
webixDb = webixData(require("webix-mongo"), require("webix-request")); //For mysql you can use the 'webix-mysql' package.
```

```js
//Map fields of data which will be used for db operations.
webixDb.map(fields, useOnlyMappedFields);
```

- fields - hash of db fields.
- useOnlyMappedFields - optional, if set 'true', for db operations will be used only set fields.
If set 'false' or ignore this parameter, for db operations will be used set and other fields.

*Method returns 'webixDb' object*

```js
//Set db object or string of connection for db operations.
webixDb.db(dataBase);
```

- dataBase - db object or string of connection.

```js
//Create handler of requests for operations on data: create, read, update and delete.
//For using this method you can use just one argument.
webixDb.crud(handling, handler);
```

- handling - optional, name of collection (mongoDB) or table (mysql) which will be used for data operations.
- handler - optional, function-callback which you can use for changing of processing of request data.

Handler provides parameters:

- state object which has fields:
    - db (object of db).
    - response (object of response).
    - request (object of request).
    - id (id of data).
    - data (without id).
    - action (operation on data).
- function-resolver - needs for return data to CRUD handler. First parameter of "resolve" is error object or null, second parameter is:
    - data - CRUD handler will be use this data for its operations.
    - true - CRUD handler will be continue its operations.
    - false - CRUD handler will be stop its operations for current request.

```js
//This method likes webixDb.crud, but works only with operation of reading.
webixDb.data(handling, handler);
```

### Samples

```js
//app - it's express object.
//state - {db, response, request, id, data, action}
//resolve - function(error, data);
```

```js
app.all("/data", webixDb.crud("films"); // CRUD handler process operations for collection (MongoDB) or table (Mysql)
```

```js
//When is used only handler, will be worked only reading operation. Other operation will be generate exception.
app.all("/data", webixDb.crud(function(state, resolve) {
    var my_data = {title: "test text", id: 5}
    resolve(null, my_data);
}));
```

```js
app.all("/data", webixDb.crud("films", function(state, resolve) {
    var my_data = {title: "my_title", id: 5}
    resolve(null, my_data); //Process my_data for collection "films" for current operation (state.action).
}));
```

*Full samples for this package you can see by [nodejs-example] (https://github.com/DHTMLX/nodejs-example).*

That is it.

License
----------

Webix is published under the GPLv3 license.

All other code is released under the MIT License:

Copyright (c) 2015

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.