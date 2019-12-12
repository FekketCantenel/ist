export { getAPI, getAuth, uuidv4, postAPI, asyncCall, postNewTaskTime };

let todoistAPI = "https://todoist.com/api/v8/sync",
    todoistToken = "0d1383928eb454f4113b8fe921292dbc8d32ad4a";

async function getAPI(path) {
    return await $.ajax({
        type: "GET",
        url: "https://api.todoist.com/rest/v1/" + path,
        dataType: "json",
        beforeSend: function(request) {
            if (todoistToken) {
                request.setRequestHeader(
                    "Authorization",
                    "Bearer " + todoistToken
                );
            }
        }
    });
}

async function getAuth(code) {
    let commands = {
        client_id: "711cd8b82f8e433f83f4972c4cae127f",
        client_secret: "ab65c865eef846e89ae64452746a8524",
        code,
        redirect_uri: "https://ist.never-ends.net/2"
    };

    $.post("https://todoist.com/oauth/access_token", commands, function(data) {
        console.log("made it here");
    }).done(function() {
        console("second success");
    });
}

function uuidv4() {
    // copied from https://stackoverflow.com/a/2117523
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
        (
            c ^
            (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
        ).toString(16)
    );
}

async function postAPI(commands) {
    return await $.post(todoistAPI, {
        token: todoistToken,
        commands
    }).done(function(data, response) {
        return response;
    });
}

async function asyncCall(commands) {
    $("body, .roundbutton").css("cssText", "cursor: progress !important");
    $("#spinner, #task").toggle();
    let result = await postAPI(JSON.stringify(commands));
    location.reload();
}

function postNewTaskTime(tasksToDefer) {
    let randUUID = "",
        commands = [];

    tasksToDefer.forEach(function(task) {
        randUUID = uuidv4();
        commands.push({
            type: "item_update",
            uuid: randUUID,
            args: {
                id: task.id,
                due: {
                    date: task.date,
                    datetime: task.date,
                    string: task.string
                }
            }
        });
    });

    asyncCall(commands);
}
