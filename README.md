To run a single agent version use this command:
```shell
npm start
```
To run a multi agent version use this command:
```shell
npm run multi
```

Instead of pure JavaScript we used TypeScript, so to run this program we suggest to use "ts-node".
Furthermore we had to modify "@unitn-asa/pddl-client", so the modified version of "PddlOnlineSolver.js" is available inside the project folder.
The program will run anyways but to obtain better performance we suggest to replace the file with this modified version.
