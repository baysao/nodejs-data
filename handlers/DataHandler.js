var Promise = require("bluebird"),
    _ = require("lodash");

function _arrayToHash(dataArray, keyField) {
    var hash = {};
    for(var i = 0; i < dataArray.length; i++) {
        var data = dataArray[i],
            key = data[keyField];

        hash[key] = data;
    }
    return hash;
}

function Tree(data, fields) {
    fields = fields || {};

    this._field_id = fields.id || "id" ;
    this._field_parent_id = fields.parent_id || "parent_id";

    var dataTree = this._dataToTree(data);
    this._elementsHash = dataTree.elements;

    this.get = function() {
        return dataTree.tree;
    }
}

Tree.prototype._dataToTree = function(data) {
    data = _.clone(data, true);

    var dataHash = _arrayToHash(data, this._field_id),
        rootElements = [];

    for(var key in dataHash) {
        var data = dataHash[key],
            parentId = data[this._field_parent_id];

        if(!dataHash.hasOwnProperty(parentId)) {
            rootElements.push(data);
            continue;
        }

        var parent = dataHash[parentId];
        parent.data = parent.data || [];
        parent.data.push(data);
    }

    return {tree: rootElements, elements: dataHash};
};

Tree.prototype._getElementById = function(id) {
    var elements = this._elementsHash;

    for(var key in elements) {
        if(key == id)
            return elements[key];
    }

    return null;
};

Tree.prototype.getBranchElements = function(rootId) {

    function _findBranchElements(parentElement) {
        var elements = parentElement.data || [];

        for(var i = 0; i < elements.length; i++) {
            var element = elements[i];

            branchElements.push(element);
            _findBranchElements(element);
        }

        return elements;
    }

    var rootElement = this._getElementById(rootId),
        branchElements = [rootElement];

    _findBranchElements(rootElement);

    return branchElements;
};

function DataHandler(controllerObj) {
    this.controller = controllerObj;
}

DataHandler.prototype.deleteData = function(requestState, collectionState) {
    var dataType = this.controller._data_type;
    if(dataType != "tree") {
        return this.controller.model.removeData(requestState.id, collectionState).then(function () {
            return {status: "deleted", source_id: requestState.id, target_id: requestState.id};
        });
    }

    var self = this;
    return this.controller.model.getData(collectionState).then(function(data) {
            var treeObj = new Tree(data);

            var branchElements = treeObj.getBranchElements(requestState.id),
                promises = [];

            for(var i = 0; i < branchElements.length; i++) {
                var element = branchElements[i],
                    elementId = element[treeObj._field_id];

                var promise = self.controller.model.removeData(elementId, collectionState);
                promises.push(promise);
            }
            return Promise.all(promises);
    }).then(function(results) {
        return {status: "deleted", source_id: requestState.id, target_id: requestState.id};
    });
};

DataHandler.prototype.moveData = function(requestState, collectionState) {
    return this.controller.model.changeOrderData(requestState.id, requestState.move_id, collectionState).then(function(result) {
        return {status: "moved", source_id: requestState.id, target_id: requestState.id};
    });
};

DataHandler.prototype.updateData = function(requestState, collectionState) {
    return this.controller.model.updateData(requestState.id, requestState.data, collectionState).then(function(updatedData) {
        return {status: "updated", source_id: requestState.id, target_id: updatedData.id || requestState.id};
    });
};

DataHandler.prototype.insertData = function(requestState, collectionState) {
    return this.controller.model.insertData(requestState.data, collectionState).then(function(insertedData) {
        return {status: "inserted", source_id: requestState.id, target_id: insertedData.id || requestState.id};
    });
};

DataHandler.prototype.getData = function(collectionState) {
    var dataType = this.controller._data_type;
    return this.controller.model.getData(collectionState).then(function(data) {
        if(dataType == "tree") {
            var treeObj = new Tree(data);
            data = treeObj.get();
        }

        return {status: "read", data: data};
    });
};

DataHandler.prototype.mapData = function(data, fieldsType) {
    var self = this;
    function _map(data, fields) {
        var mappedData = Array.isArray(data) ? [] : {};
        for(var key in data) {
            var fieldByAnchor = self.getFieldByAnchor(key);
            if(fields.hasOwnProperty(key) || fieldByAnchor)
                mappedData[fields[key] || fieldByAnchor] = data[key];
            else if(!self.controller._use_only_mapped_fields)
                mappedData[key] = data[key];
        }
        return mappedData;
    }

    for(var key in data) {
        var currentData = data[key];
        if(typeof currentData == "object")
            data[key] = this.mapData(currentData, fieldsType);

    }

    var fields = (fieldsType == "client") ? this.controller._client_fields : this.controller._server_fields;
    return _map(data, fields);
};

DataHandler.prototype.getFieldByAnchor = function(field) {
    var fieldsAnchors = this.controller._fields_anchors;
    for(var key in fieldsAnchors) {
        if(field == fieldsAnchors[key])
            return key;
    }

    return null;
};

DataHandler.prototype.getFieldData = function(data, field) {
    var fieldData = data[field];
    return fieldData || data[this.getFieldByAnchor(field)];
};

DataHandler.prototype.deleteFieldData = function(data, field) {
    if(data.hasOwnProperty(field))
        delete data[field];
    else
        delete data[this.getFieldByAnchor(field)];

    return data;
};

module.exports = DataHandler;