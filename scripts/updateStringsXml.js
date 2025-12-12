var fs = require('fs');
var path = require('path');

function getConfigParser(context, configPath) {
    var ConfigParser;
    try {
        // cordova-common 2.x
        ConfigParser = context.requireCordovaModule('cordova-common').ConfigParser;
    } catch (e) {
        // Fallback for older cordova versions or different paths
        try {
             ConfigParser = context.requireCordovaModule('cordova-lib/src/configparser/ConfigParser');
        } catch (e2) {
             // If all else fails, try to require directly if available in node_modules
             ConfigParser = require('cordova-common').ConfigParser;
        }
    }
    return new ConfigParser(configPath);
}

module.exports = function(context) {
    var Q = context.requireCordovaModule('q');
    var deferral = Q.defer();

    try {
        // Get package name from config.xml
        var configXmlPath = path.join(context.opts.projectRoot, 'config.xml');
        var appConfig = getConfigParser(context, configXmlPath);
        var packageName = appConfig.packageName();
        
        var contentAuthority = packageName;
        var accountType = packageName + ".account";

        console.log('Running updateStringsXml hook...');
        console.log('Package Name: ' + packageName);

        // Find strings.xml path
        var platformRoot = path.join(context.opts.projectRoot, 'platforms/android');
        var possiblePaths = [
            path.join(platformRoot, 'app/src/main/res/values/strings.xml'),
            path.join(platformRoot, 'res/values/strings.xml')
        ];

        var stringsXmlPath = null;
        for (var i = 0; i < possiblePaths.length; i++) {
            if (fs.existsSync(possiblePaths[i])) {
                stringsXmlPath = possiblePaths[i];
                break;
            }
        }

        if (!stringsXmlPath) {
            console.warn('Could not find strings.xml in android platform. Skipping...');
            deferral.resolve();
            return deferral.promise;
        }

        console.log('Found strings.xml at: ' + stringsXmlPath);

        // Read and update strings.xml
        var data = fs.readFileSync(stringsXmlPath, 'utf8');
        var xml = data;
        var changed = false;

        // Add plugin_bgloc_content_authority if missing
        if (xml.indexOf('name="plugin_bgloc_content_authority"') === -1) {
            var stringTag = '    <string name="plugin_bgloc_content_authority">' + contentAuthority + '</string>';
            xml = xml.replace('</resources>', stringTag + '\n</resources>');
            changed = true;
            console.log('Added plugin_bgloc_content_authority: ' + contentAuthority);
        }

        // Add plugin_bgloc_account_type if missing
        if (xml.indexOf('name="plugin_bgloc_account_type"') === -1) {
            var stringTag = '    <string name="plugin_bgloc_account_type">' + accountType + '</string>';
            xml = xml.replace('</resources>', stringTag + '\n</resources>');
            changed = true;
            console.log('Added plugin_bgloc_account_type: ' + accountType);
        }

        if (changed) {
            fs.writeFileSync(stringsXmlPath, xml, 'utf8');
            console.log('Successfully updated strings.xml');
        } else {
            console.log('strings.xml already contains required values.');
        }
        
        deferral.resolve();
    } catch (e) {
        console.error('Error in updateStringsXml hook: ' + e);
        deferral.reject(e);
    }

    return deferral.promise;
};

