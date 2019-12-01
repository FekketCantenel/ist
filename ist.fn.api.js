export { getAPI, uuidv4, postAPI, asyncCall, postNewTaskTime };

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
