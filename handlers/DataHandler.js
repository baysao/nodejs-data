var Promise = require("bluebird"),
    Tree = require("../data_types/Tree"),
    _ = require("lodash");

function DataHandler(controllerProvider) {
    this._controllerProvider = controllerProvider;
}

DataHandler.prototype.deleteData = function(requestState, collectionState) {
    var dataType = this._controllerProvider.getDataType();
    if(dataType != "tree") {
        return this._controllerProvider.getModelObj().removeData(requestState.id, collectionState).then(function () {
            return {status: "deleted", source_id: requestState.id, target_id: requestState.id};
        });
    }

    var self = this;
    return this._controllerProvider.getModelObj().getData(collectionState).then(function(data) {
        var treeObj = new Tree(data, self._controllerProvider.getFieldsAnchors()),
            branchElements = treeObj.getBranchElements(requestState.id),
            promises = [];

        for(var i = 0; i < branchElements.length; i++) {
            var element = branchElements[i],
                elementId = element[treeObj._field_id];

            var promise = self._controllerProvider.getModelObj().removeData(elementId, collectionState);
            promises.push(promise);
        }
        return Promise.all(promises);
    }).then(function() {
        return {status: "deleted", source_id: requestState.id, target_id: requestState.id};
    });
};

DataHandler.prototype.moveData = function(requestState, collectionState) {
    return this._controllerProvider.getModelObj().changeOrderData(requestState.id, requestState.move_id, collectionState).then(function(result) {
        return {status: "moved", source_id: requestState.id, target_id: requestState.id};
    });
};

DataHandler.prototype.updateData = function(requestState, collectionState) {
    var fieldId = this.getFieldByAnchor("id");
    return this._controllerProvider.getModelObj().updateData(requestState.id, requestState.data, collectionState).then(function(updatedData) {
        return {status: "updated", source_id: requestState.id, target_id: updatedData[fieldId] || requestState.id};
    });
};

DataHandler.prototype.insertData = function(requestState, collectionState) {
    var fieldId = this.getFieldByAnchor("id");
    return this._controllerProvider.getModelObj().insertData(requestState.data, collectionState).then(function(insertedData) {
        return {status: "inserted", source_id: requestState.id, target_id: insertedData[fieldId] || requestState.id};
    });
};

DataHandler.prototype.getData = function(collectionState) {
    var dataType = this._controllerProvider.getDataType(),
        self = this;

    return this._controllerProvider.getModelObj().getData(collectionState).then(function(data) {
        if(dataType == "tree") {
            var treeObj = new Tree(data, self.getFieldByAnchor(self._controllerProvider.getFieldsAnchors()));
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
            if(fields.hasOwnProperty(key))
                mappedData[fields[key]] = data[key];
            else if(!self._controllerProvider.getUseOnlyMappedFields())
                mappedData[key] = data[key];
        }
        return mappedData;
    }

    for(var key in data) {
        var currentData = data[key];
        if(typeof currentData == "object")
            data[key] = this.mapData(currentData, fieldsType);

    }

    var fields = this._controllerProvider.getFields(fieldsType);
    return _map(data, fields);
};

DataHandler.prototype.getFieldByAnchor = function(anchor) {
    var self = this;
    function _getField(anchor) {
        var fieldsAnchors = self._controllerProvider.getFieldsAnchors(),
            field = fieldsAnchors[anchor];

        return self._controllerProvider.getFields("server")[field] || field;
    }

    if(typeof anchor == "object") {
        var fields = {};
        for(var key in anchor)
            fields[key] = _getField(key);

        return fields;
    }

    return _getField(anchor);
};

DataHandler.prototype.getFieldDataByAnchor = function(data, anchor) {
    return data[this.getFieldByAnchor(anchor)];
};

DataHandler.prototype.deleteFieldDataByAnchor = function(data, anchor) {
    delete data[this.getFieldByAnchor(anchor)];
    return data;
};

module.exports = DataHandler;