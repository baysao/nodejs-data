function _arrayToHash(dataArray, keyField) {
    var hash = {};
    for(var i = 0; i < dataArray.length; i++) {
        var data = dataArray[i],
            key = data[keyField];

        hash[key] = data;
    }
    return hash;
}

function _dataToTree(data) {

    var dataHash = _arrayToHash(data, "id"),
        rootElements = [];

    for(var key in dataHash) {
        var data = dataHash[key],
            parentId = data[FIELD_PARENT_ID];

        if(!dataHash.hasOwnProperty(parentId)) {
            rootElements.push(data);
            continue;
        }

        var parent = dataHash[parentId];
        parent.data = parent.data || [];
        parent.data.push(data);
    }

    return rootElements;
}

function DataHandler(settings) {
    settings = settings || {};
    this.scope = {
        model: settings.model || {},
        data_type: settings.data_type || null,
        use_only_mapped_fields: (settings.use_only_mapped_fields === true) ? true : false,
        client_fields: settings.client_fields || {},
        server_fields: settings.server_fields || {},
        fields_anchors: settings.fields_anchors || {}
    };
}

DataHandler.prototype.deleteData = function(data, collectionState) {
    return this.scope.model.removeData(data.id, collectionState).then(function() {
        return {status: "deleted", source_id: data.id, target_id: data.id};
    });
}

DataHandler.prototype.moveData = function(data, collectionState) {
    return this.scope.model.changeOrderData(data.id, data.move_id, collectionState).then(function(result) {
        return {status: "moved", source_id: data.id, target_id: data.id};
    });
}

DataHandler.prototype.updateData = function(data, collectionState) {
    return this.scope.model.updateData(data.id, data.data, collectionState).then(function(updatedData) {
        return {status: "updated", source_id: data.id, target_id: updatedData.id || data.id};
    });
}

DataHandler.prototype.insertData = function(data, collectionState) {
    return this.scope.model.insertData(data.data, collectionState).then(function(insertedData) {
        return {status: "inserted", source_id: data.id, target_id: insertedData.id || data.id};
    });
}

DataHandler.prototype.getData = function(data, collectionState) {
    var dataType = this.scope.data_type;
    return this.scope.model.getData(collectionState).then(function(data) {
        if(dataType == "tree")
            data = _dataToTree(data);

        return {status: "read", data: data};
    });
}

DataHandler.prototype.mapData = function(data, fieldsType) {
    var self = this;
    function _map(data, fields) {
        var mappedData = Array.isArray(data) ? [] : {};
        for(var key in data) {
            var fieldByAnchor = self.getFieldByAnchor(key);
            if(fields.hasOwnProperty(key) || fieldByAnchor)
                mappedData[fields[key] || fieldByAnchor] = data[key];
            else if(!self.scope.use_only_mapped_fields)
                mappedData[key] = data[key];
        }
        return mappedData;
    }

    var mappedData = [],
        fields = (fieldsType == "client") ? this.scope.client_fields : this.scope.server_fields;

    for(var key in data) {
        var currentData = data[key];
        if(typeof currentData == "object")
            data[key] = this.mapData(currentData, fieldsType);

    }

    return _map(data, fields);
}

DataHandler.prototype.getFieldByAnchor = function(field) {
    var fieldsAnchors = this.scope.fields_anchors;
    for(var key in fieldsAnchors) {
        if(field == fieldsAnchors[key])
            return key;
    }

    return null;
}

DataHandler.prototype.getFieldData = function(data, field) {
    var fieldData = data[field];
    return fieldData || data[this.getFieldByAnchor(field)];
}

DataHandler.prototype.deleteFieldData = function(data, field) {
    if(data.hasOwnProperty(field))
        delete data[field];
    else
        delete data[this.getFieldByAnchor(field)];

    return data;
}

module.exports = DataHandler;