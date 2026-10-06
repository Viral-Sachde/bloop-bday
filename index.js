/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { registerBackgroundHandler } from './src/services/notifications';

// Must be registered at the top level so alarms can top themselves up while the app is closed.
registerBackgroundHandler();

AppRegistry.registerComponent(appName, () => App);
