# Description
This is an exam project for the course "Autonomous Software Agents" @ UniTN.
This project aimed to develop an autonomous and rational (multi-)agent system to play the game of Deliveroo.
This task is inspired by the real-world challenge faced by courier services, where packages need to be delivered to various locations efficiently and promptly.
Specifically, the game is set on a two-dimensional map where parcels are generated randomly, each with a reward value that may decrease over time.
The agents' goal is to collect and deliver these parcels to the designated locations to maximize their total rewards.

# Usage
To run a single agent version use this command:
```shell
npm start
```
To run a multi agent version use this command:
```shell
npm run multi
```

Instead of pure JavaScript we used TypeScript, so to run this program we suggest to use "ts-node".
Furthermore we had to modify "@unitn-asa/pddl-client" library, so the modified version of "PddlOnlineSolver.js" is available inside the project folder.
The program will run anyways but to obtain better performance we suggest to replace the file with this modified version.
