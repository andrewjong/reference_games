# Info
This is a fork of https://github.com/hawkrobe/reference_games that adds two experiments: "chineseColorRef" and "cards."

- _chineseColorRef_, a Chinese version of the color reference game is located in ```experiments/colors/chineseColorRef```. Since the Chinese version has modified files in the ```sharedUtils/``` folder for Chinese strings, it lives on its own branch: chinese-master.

- _cards_, a new game to collect corpora in a changing environment, is located in ```experiments/cards```. This branch lives on the default branch: cards-master.

For background knowledge about these games, please consult [Andrew Jong](andrewjong@cs.stanford.edu "andrewjong@cs.stanford.edu"), [Jennifer Hu](jenniferhu@college.harvard.edu "jennhu@college.harvard.edu"), [Will Monroe](wmonroe4@stanford.edu "wmonroe4@stanford.edu"), or [Chris Potts](cgpotts@stanford.edu "cgpotts@stanford.edu").


**To test locally, see https://github.com/hawkrobe/reference_games**

## Deploying On Heroku
(At the moment, this is mainly for _chineseColorRef_, but will expand to _cards_ once it is in a deployable state.)

For NodeJS apps, Heroku requires the root directory to have a package.json file. As this project is structured with package.json in experiments/ and not in the root, an easy way to deploy on heroku is with git subtrees.

After adding your heroku remote, use the command:

```git push heroku `git subtree split --prefix experiments chinese-master`:master --force```

to push the directory ```experiments``` from branch chinese-master to Heroku's master.

This app also uses MongoDB for its database. Add the MLab add-on (or another MongoDB service) on Heroku. See [here](https://devcenter.heroku.com/articles/mongolab) for more detail. The code for writing to MongoDB is in ```sharedUtils/sharedUtils.js```.

For assistance/questions, feel free to email [Andrew](andrewjong@cs.stanford.edu "andrewjong@cs.stanford.edu")!
