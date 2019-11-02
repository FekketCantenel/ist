export { getAPI, postAPI };

let todoistAPI = "https://todoist.com/api/v8/sync",
    todoistToken = "0d1383928eb454f4113b8fe921292dbc8d32ad4a",
    randUUID = "";

async function getAPI(resourceType) {
    let resourceTypeArray = '["' + resourceType + '"]';

    return (await $.getJSON(todoistAPI, {
        token: todoistToken,
        sync_token: "*",
        resource_types: resourceTypeArray
    }))[resourceType];
}

async function postAPI(commands) {
    return await $.post(todoistAPI, {
        token: todoistToken,
        commands
    }).done(function(data, response) {
        return response;
    });
}
