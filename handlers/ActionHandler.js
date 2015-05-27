var DataHandler = require("./DataHandler"),
    Promise = require("bluebird"),
    _ = require("lodash");

function ActionHandler(controllerProvider) {
    this._controllerProvider = controllerProvider;
    this._dataHandler = new DataHandler(controllerProvider);
}

ActionHandler.prototype.processRequest = function(requestState, collectionState) {
    var actionPromise;
    switch(requestState.action) {
        case "read":
            actionPromise = this._dataHandler.getData(collectionState);
            break;

        case "insert":
            actionPromise = this._dataHandler.insertData(requestState, collectionState);
            break;

        case "update":
            actionPromise = this._dataHandler.updateData(requestState, collectionState);
            break;

        case "move":
            actionPromise = this._dataHandler.moveData(requestState, collectionState);
            break;

        case "delete":
            actionPromise = this._dataHandler.deleteData(requestState, collectionState);
            break;

        default:
            actionPromise = new Promise(function(reject) {
                reject(new Error("Action '" + requestState.action + "' isn't support."));
            });
            break;
    }

    return actionPromise.error(function(error) {
        return {status: "error", error: error};
    });
};

ActionHandler.prototype.getRequestStateData = function(requestData, state) {
    state = state || {};
    requestData = _.clone(requestData, true);

    //Get id field or his anchor data.
    state.id = (this._dataHandler.getFieldDataByAnchor(requestData.data, "id") || "").toString();
    //Delete id field or his anchor.
    requestData.data = this._dataHandler.deleteFieldDataByAnchor(requestData.data, "id");
    state.action = state.action || requestData.action;
    delete requestData.action;
    state.data = requestData.data;
    return state;
};

ActionHandler.prototype.createActionHandler = function(action) {
    var self = this;

    return function(handling, handler) {
        if((arguments.length == 1) && (typeof handling == "function")) {
            handler = handling;
            handling = null;
        }

        return function(request, response) {
            var state = {request: request, response: response};
            self._controllerProvider.getRequestObj().processRequest(state, function(requestData, requestResolver) {
                var requestStateData = self.getRequestStateData(requestData),
                    actionHandlerData = {handler_action: action, request_data: requestStateData};

                function _resolver(error, data) {
                    if(error) {
                        actionHandlerData.error = error;
                        self.processAction(actionHandlerData, requestResolver);
                        return false;
                    }

                    if(!!data && (typeof data == "object")) {
                        actionHandlerData.data = data;
                        self.processAction(actionHandlerData, requestResolver);
                        return true;
                    }

                    if((data === true) && (handling != null)) {
                        actionHandlerData.handling = handling;
                        self.processAction(actionHandlerData, requestResolver);
                        return true;
                    }
                }

                if(handler) {
                    var state = {db: self._controllerProvider.getModelObj().getDb(), response: response, request: request};
                    if(action != "crud")
                        handler.apply(null, [state, _resolver]);
                    else {
                        state = self.getRequestStateData(requestData, state);
                        state.data = self._dataHandler.mapData(state.data, "server");
                        handler.apply(null, [state, _resolver]);
                    }
                }
                else if(handling != null) {
                    actionHandlerData.handling = handling;
                    self.processAction(actionHandlerData, requestResolver);
                }
            });
        }
    }
};

ActionHandler.prototype.processAction = function(handlerData, callback) {
    if(handlerData.error) {
        callback({status: "error", error: handlerData.error});
        return false;
    }

    var requestStateData = handlerData.request_data,
        action = requestStateData.action,
        data = handlerData.data,
        collectionState = {
            handling: handlerData.handling,
            field_id: this._dataHandler.getFieldByAnchor("id"),
            field_order: null
        };

    var fieldOrder = this._dataHandler.getFieldByAnchor("order");
    if(this._controllerProvider.isFieldMapped("order"))
        collectionState.field_order = fieldOrder;

    if(action == "read") {
        if(data) {
            data = this._dataHandler.mapData(data, "client");
            callback({status: "read", data: data});
            return true;
        }

        var self = this;
        this.processRequest(requestStateData, collectionState).then(function(data) {
            if(data.status == "error") {
                callback(data);
                return true;
            }

            data = self._dataHandler.mapData(data.data, "client");
            callback({status: "read", data: data});
        });
        return true;
    }
    else if(handlerData.handler_action == "data")
        return false;

    if(data)
        requestStateData.data = data;

    requestStateData.data = this._dataHandler.mapData(requestStateData.data, "server");

    this.processRequest(requestStateData, collectionState).then(function(data) {
        callback(data);
    });
};

module.exports = ActionHandler;