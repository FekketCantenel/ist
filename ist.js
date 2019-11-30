import { getAPI } from "./ist.fn.api.js";
import {
    getAllTasks,
    getDueTasks,
    getSuggestTasksHTML
} from "./ist.fn.list.js";
import { getHighestPriorityTask, getTaskHTML } from "./ist.fn.task.js";
import { setEvents } from "./ist.fn.event.js";

$(document).ready(function() {
    async function asyncCall() {
        let todoistRawTasks = await getAPI("tasks");

        //let todoistRawNotes = await getAPI("comments");

        // create master object with extra useful values, narrow down to 'due'
        let allTasks = getAllTasks(todoistRawTasks),
            dueTasks = getDueTasks(allTasks);

        let projects = await getAPI("projects");

        // checks first for 'routine' tasks in top project
        let highestPriorityTask = getHighestPriorityTask(
            dueTasks,
            projects.find(({ order }) => order === 1)
        );

        if (highestPriorityTask == undefined) {
            // check if a project has already been chosen for viewing
            let chosenProjectID = sessionStorage.getItem("project.id");

            if (chosenProjectID) {
                highestPriorityTask = getHighestPriorityTask(
                    dueTasks,
                    projects.find(({ id }) => id === Number(chosenProjectID))
                );
            }
        }

        if (highestPriorityTask) {
            let mainTask = getTaskHTML(highestPriorityTask, projects);
            $("#task").append(mainTask);
        } else {
            sessionStorage.removeItem("project.id");
            let suggestTasks = getSuggestTasksHTML(
                allTasks,
                dueTasks,
                projects
            );
            $("#task").append(suggestTasks);
        }

        $("#spinner").hide();

        setEvents(dueTasks, allTasks);
    }
    asyncCall();
});
