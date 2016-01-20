
{
    init: function(elevators, floors) {
        // solution-v0.2
        // for challenge 19 
        // 
        // Transported         2996
        // Elapsed time        2013s
        // Transported/s       1.49
        // Avg waiting time    13.9s
        // Max waiting time    46.6s
        // Moves               21183

        MAX_FLOOR = floors.length;
        MAX_ELEV = elevators.length;

        UP_TASK_INTERNAL = MAX_FLOOR * 100;

        // Array of those floors that need to go up
        _uplist = new Array();
        // Array of those floors that need to go down
        _downlist = new Array();
        //===============================
        //CONSTANTS
        STATE_IDLE  = 0;
        STATE_UP    = 1;
        STATE_DOWN  = 2;

        //===============================
        //FUNCTION EXTEND
        Array.prototype.unique = function(){
            var n = {},r=[]; 
            for(var i = 0; i < this.length; i++) {
                if (!n[this[i]]) {
                    n[this[i]] = true;
                    r.push(this[i]);
                }
            }
            return r;
        }
        Array.prototype.remove = function (dx) {  
            if (isNaN(dx) || dx > this.length) {  
                return false;  
            }  
            for (var i = 0, n = 0; i < this.length; i++) {  
                if (this[i] != this[dx]) {  
                    this[n++] = this[i];  
                }  
            }  
            this.length -= 1;  
        };  
        //===============================
        // execute 'go up' task
        function startUpTask(e){
            if(e.state == STATE_IDLE){
                e.stop();
            }
            var c = e.currentFloor();
            if(floors[c].buttonStates.up!=""){
                _uplist.push(c);
                _uplist = _uplist.unique().sort(function(a,b){
                    return a>b;
                });
            }
            e.state = STATE_UP;
            e.goingUpIndicator(true);
            e.goingDownIndicator(false);
            e.goToFloor(0);
        }

        // execute 'go down' task
        function startDownTask(e){
            if(e.state == STATE_IDLE){
                e.stop();
            }
            e.state = STATE_DOWN;
            e.goingUpIndicator(false);
            e.goingDownIndicator(true);

            var c = e.currentFloor();
            if(floors[c].buttonStates.down!=""){
                // the elevator will leave this floor
                // if down button is still pressed , add it to _downlist
                _downlist.push(c);
                _downlist = _downlist.unique().sort(function(a,b){
                    return a<b;
                });
            }
            if(isFull(e)){
                // goto 0 floor when elevator is full
                e.goToFloor(0);
            }else{
                if(e.loadFactor()==0){
                    // if elevator is empty , goto the highest floor
                    e.goToFloor(_downlist[0]);
                    _downlist.shift();
                }else{
                    // find next floor 
                    var nextFloor = 0;
                    for(var j=0;j<_downlist.length;j++){
                        if(_downlist[j]<c){
                            nextFloor = _downlist[j];
                            if(_downlist[j]!=0){
                                _downlist.remove(j);
                            }
                            break;
                        }
                    }
                    e.goToFloor(nextFloor);
                }
            }
        }

        // TODO:the function need to refine
        function assignTask(e){
            if(e.loadFactor()!=0 && e.state == STATE_DOWN){
                // the elevator is executing 'go down' task , let it continue
                startDownTask(e);
                return "down";
            }
            if(e.currentFloor()>floors.length/2 && _downlist.length>0){
                startDownTask(e);
                return "down";
            }
            if(_uplist.length==0){
                if(_downlist.length==0){
                    e.goToFloor(e.idle_floor);
                    return "";
                }else{
                    startDownTask(e);
                    return "down";
                }
            }else{
                if(_downlist.length==0){
                    startUpTask(e);
                    return "up";
                }else{
                    // if those elevators executing 'go up' outnumber those executing 'go down'
                    // the idle elevator will execute 'go down' task
                    // otherwise , execute 'go up'.
                    var upCount = 0;
                    var downCount = 0;
                    for(var i=0;i<MAX_ELEV;i++){
                        if(elevators[i].state == STATE_UP){
                            upCount++;
                        }else if(elevators[i].state == STATE_DOWN){
                            downCount++;
                        }
                    }
                    if(upCount>=downCount){
                        startDownTask(e);
                        return "down";
                    }else{
                        startUpTask(e);
                        return "up";
                    }
                }
            }
        }

        function isFull(e){
            var loadFactor = e.loadFactor();
            var maxPassengerCount = e.maxPassengerCount();
            var neededAvgPassengerSpace = 1.5;
            return (1-loadFactor) < (neededAvgPassengerSpace/maxPassengerCount)
        }

        var p = MAX_FLOOR / (MAX_ELEV+1);
        var totalCapacity = 0;

        for(var i=0;i<MAX_ELEV;i++){
            var e = elevators[i];
            totalCapacity += e.maxPassengerCount();
            e.ei = i;
            e.state = STATE_IDLE;
            e.idle_floor = Math.round(p * (i) + 0.5);

            e.on("floor_button_pressed", function(n) {
                if(n > 0){
                    this.state = STATE_UP;
                    while(_uplist.length>1){
                        this.destinationQueue.push(_uplist.pop());
                    }

                    this.destinationQueue.push(n);
                    this.destinationQueue = this.destinationQueue.unique().sort(function(a,b){
                        return a>b;
                    });
                    this.checkDestinationQueue();
                }
            });
            e.on("stopped_at_floor",function(n){
                // Do nothing
            });
            e.on("idle",function(){
                assignTask(this);
            });    
        }

        for(var i=0;i<MAX_ELEV;i++){
            var e = elevators[i];
            e.weight = e.maxPassengerCount() / totalCapacity;
            console.log("e "+i+ " weight = "+e.weight);
        }

        // notify idle elevators to work
        function notifyElevators(){
            for(var i=0;i<MAX_ELEV;i++){
                var e = elevators[i];
                if(e.state == STATE_IDLE){
                    if(assignTask(e)!=""){
                        break;
                    }
                }
            }
        }

        for(var i=0;i<MAX_FLOOR;i++){
            var f = floors[i];
            f.on("up_button_pressed",function(){
                _uplist.push(this.level);
                _uplist = _uplist.unique().sort(function(a,b){
                    return a>b;
                });
                notifyElevators();
            });
            f.on("down_button_pressed",function(){
                _downlist.push(this.level);
                _downlist = _downlist.unique().sort(function(a,b){
                    return a<b;
                });
                notifyElevators();
            });
        }

    },
    update: function(dt, elevators, floors){}
}