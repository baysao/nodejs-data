var _ = require("lodash");

function _arrayToHash(dataArray, keyField) {
    var handler = null;
    if(typeof keyField == "function")
        handler = keyField;

    var hash = {};
    for(var i = 0; i < dataArray.length; i++) {
        var data = dataArray[i];

        if(handler) {
            handler(data);
            continue;
        }

        var key = data[keyField];
        hash[key] = data;
    }

    return hash;
}

function Tree(data, fields) {
    fields = fields || {};

    this._field_id = fields.id || "id" ;
    this._field_parent_id = fields.parent_id || "parent_id";
    this._field_is_has_children = fields.field_is_has_children || "children";
    this._field_children = fields.field_children || "data";

    this._elements = data;

    var dataTree = this._dataToTree(data);
    this._elementsHash = dataTree.elements_hash;
    this._elements = dataTree.elements;

    this.get = function() {
        return dataTree.tree;
    }
}

Tree.ROOT_TREE_ID = 0;

Tree.prototype._dataToTree = function(data) {
    data = _.clone(data, true);

    var dataHash = _arrayToHash(data, this._field_id),
        fieldParentId = this._field_parent_id,
        fieldChildren = this._field_children,
        rootElements = [];

    for(var key in dataHash) {
        var node = dataHash[key],
            parentId = node[fieldParentId];

        if(!dataHash.hasOwnProperty(parentId)) {
            rootElements.push(node);
            continue;
        }

        var parent = dataHash[parentId];
        parent[fieldChildren] = parent[fieldChildren] || [];
        parent[fieldChildren].push(node);
    }

    var rootObj = {};
    for(var i = 0; i < rootElements.length; i++) {
        var rootElement = rootElements[i];
        rootObj[fieldParentId] = rootElements[0][fieldParentId];
        rootObj[fieldChildren] = rootObj[fieldChildren] || [];
        rootObj[fieldChildren].push(rootElement);
    }

    return {tree: rootObj, elements: data, elements_hash: dataHash};
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
    var fieldChildren = this._field_children;

    function _findBranchElements(parentElement) {
        var elements = parentElement[fieldChildren] || [];

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

Tree.prototype.getItemChildren = function(itemId) {
    var elements = _.clone(this._elements, true),
        children = [];

    var fieldChildren = this._field_children,
        fieldIsHasChildren = this._field_is_has_children,
        fieldParentId = this._field_parent_id;

    _arrayToHash(this._elements, function(element) {
        if(element[fieldParentId] != itemId)
            return false;

        if(element.hasOwnProperty(fieldChildren)) {
            delete element[fieldChildren];
            element[fieldIsHasChildren] = true;
        }

        children.push(element);
        return true;
    });

    var node = {};
    node[fieldParentId] = itemId;
    node[fieldChildren] = children;
    return node;
};

module.exports = Tree;