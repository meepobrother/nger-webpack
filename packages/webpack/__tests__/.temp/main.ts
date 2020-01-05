
require('../main');
if ((module as any).hot) {
    (module as any).hot.accept('../main', () => {
        require('../main');
    });
}