/* global Cookies, $, location, crypto */
export {
    getAPI,
    syncAPI,
    getURLParameter,
    getAuth,
    uuidv4,
    postAPI,
    asyncCall,
    postNewTaskTime
};
// import ENV from './env.js';

const todoistAPI = 'https://todoist.com/api/v8/sync',
    todoistToken = Cookies.get('todoistToken');

async function getAPI(path) {
    try {
        return await $.ajax({
            type: 'GET',
            url: `https://api.todoist.com/rest/v1/${path}`,
            dataType: 'json',
            beforeSend: function (request) {
                if (todoistToken) {
                    request.setRequestHeader(
                        'Authorization',
                        `Bearer ${todoistToken}`
                    );
                }
            }
        });
    } catch (e) {
        try {
            return await getAPI(path);
        } catch (e2) {
            console.error(e2);
            const errorText =
                'Error while getting data from Todoist.<br />Reload to try again.';
            $('#task').append(errorText);
            $('#spinner').toggle();
            throw new Error(errorText);
        }
    }
}

async function syncAPI(path, commands) {
    try {
        return $.get(
            `https://api.todoist.com/sync/v8/${path}?token=${todoistToken}&uuid=${uuidv4()}&${$.param(
                commands
            )}`
        ).done(function (data, response) {
            return response;
        });
    } catch (e) {
        try {
            return await syncAPI(path, commands);
        } catch (e2) {
            console.error(e2);
            const errorText =
                'Error while sending data to Todoist.<br />Reload to try again.';
            $('#task').append(errorText);
            // $('#spinner').toggle();
            throw new Error(errorText);
        }
    }
}

function getURLParameter(name) {
    // modified from https://davidwalsh.name/query-string-javascript
    name = name.replace(/[[]/, '\\[').replace(/[\]]/, '\\]');

    const regex = new RegExp(`[\\?&]${name}=([^&#]*)`),
        results = regex.exec(location.search);
    return results === null
        ? ''
        : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

async function getAuth(code) {
    const commands = {
        client_id: secrets.CLIENTID,
        client_secret: secrets.CLIENTSC,
        code,
        redirect_uri: 'https://ist.never-ends.net/'
    };

    return $.post('https://todoist.com/oauth/access_token', commands);
}

function uuidv4() {
    // copied from https://stackoverflow.com/a/2117523
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
        (
            c ^
            (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
        ).toString(16)
    );
}

async function postAPI(commands) {
    return $.post(todoistAPI, {
        token: todoistToken,
        commands
    }).done(function (data, response) {
        return response;
    });
}

async function asyncCall(commands, toggle = 1) {
    $('body, .roundbutton').css('cssText', 'cursor: progress !important');
    if (toggle === 1) {
        $('#spinner, #task').toggle();
    }
    await postAPI(JSON.stringify(commands));
    location.reload();
}

function postNewTaskTime(tasksToDefer) {
    let randUUID = '';
    const commands = [];

    tasksToDefer.forEach(function (task) {
        randUUID = uuidv4();
        commands.push({
            type: 'item_update',
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

    asyncCall(commands, 0);
}
