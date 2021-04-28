import {HTML} from 'builtin-elements';

export class Main extends HTML.Element {
  upgradedCallback() {
    this.textContent = 'Main Content';
  }
}
