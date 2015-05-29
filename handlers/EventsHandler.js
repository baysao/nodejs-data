function EventsHandler() {
    var _eventsStore = {};

    function _transformEventName(eventName) {
        return eventName.toLowerCase();
    }

    this.attachEvent = function(eventName, handler) {
        if(eventName == null)
            return false;

        eventName = _transformEventName(eventName);

        if(!_eventsStore[eventName])
            _eventsStore[eventName] = [];

        _eventsStore[eventName].push(handler);
        return true;
    };

    this.detachEvent = function(eventName, handler) {
        if(eventName == null)
            return false;

        eventName = _transformEventName(eventName);

        var eventHandlersArr = _eventsStore[eventName];
        if(!eventHandlersArr)
            return false;

        eventHandlersArr.splice(handler);

        if(eventHandlersArr.length == 0)
            delete _eventsStore[eventName];

        return true;
    };

    this.detachAllEvents = function() {
        _eventsStore = {};
        return true;
    };

    this.callEvent = function(eventName, eventData) {
        if(eventName == null)
            return true;

        eventName = _transformEventName(eventName);

        var eventHandlersArr = _eventsStore[eventName];
        if(!eventHandlersArr)
            return true;

        var resultCallEvents = true;
        for(var i = 0; i < eventHandlersArr.length; i++)
            resultCallEvents = resultCallEvents && eventHandlersArr[i].apply(this, (Array.isArray(eventData)) ? eventData : [eventData]);

        return resultCallEvents;
    };

    this.checkEvent = function(eventName) {
        return (eventName != null) && !!_eventsStore[_transformEventName(eventName)];
    };

}

module.exports = EventsHandler;