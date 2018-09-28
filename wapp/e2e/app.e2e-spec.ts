import { WndexDappPage } from './app.po';

describe('wndex-dapp App', () => {
  let page: WndexDappPage;

  beforeEach(() => {
    page = new WndexDappPage();
  });

  it('should display welcome message', () => {
    page.navigateTo();
    expect(page.getParagraphText()).toEqual('Welcome to app!');
  });
});
