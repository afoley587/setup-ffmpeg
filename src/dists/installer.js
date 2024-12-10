import * as assert from 'assert';
import * as os from 'os';

import * as tc from '@actions/tool-cache';
import * as core from '@actions/core';
import * as semver from 'semver';

import {GyanInstaller} from './gyan';
import {JohnVanSickleInstaller} from './johnvansickle';
import {EvermeetCxInstaller} from './evermeet.cx';

/**
 * @typedef {object} InstallerOptions
 * @property {string} version
 * @property {string} arch
 * @property {boolean} [skipIntegrityCheck]
 * @property {string} toolCacheDir
 * @property {string} [githubToken]
 * @property {string} linkingType
 */

/**
 * @typedef {object} InstalledTool
 * @property {string} version
 * @property {string} path
 */

/**
 * @typedef {object} InstallOutput
 * @property {string} version
 * @property {string} path
 * @property {boolean} cacheHit
 */

/**
 * @typedef {object} ReleaseInfo
 * @property {string} version
 * @property {boolean} [isGitRelease]
 * @property {string[]} downloadUrl
 * @property {string[]} [checksumUrl]
 */

/**
 * @param options {InstallerOptions}
 * @returns {GyanInstaller | JohnVanSickleInstaller | EvermeetCxInstaller}
 */
function getInstaller(options) {
  const platform = os.platform();
  if (platform === 'linux') {
    return new JohnVanSickleInstaller(options);
  } else if (platform === 'win32') {
    return new GyanInstaller(options);
  } else if (platform === 'darwin') {
    return new EvermeetCxInstaller(options);
  }
  assert.ok(false, 'Unsupported platform');
}

/**
 * @param installer {ReturnType<getInstaller>}
 * @param options {InstallerOptions}
 */
async function getRelease(installer, options) {
  const releases = await installer.getAvailableReleases();
  const installVer = semver.maxSatisfying(
    releases.map(({version}) => version),
    options.version,
  );
  const release = releases.find(({version}) => version === installVer);
  assert.ok(release, `Requested version ${installVer} is not available`);
  return release;
}

/**
 * @param options {InstallerOptions}
 * @returns {Promise<InstallOutput>}
 */
export async function install(options) {
  // Retry configuration
  const maxRetries = 5;
  const initialDelay = 1000; // 1 second

  // Function to handle retries with exponential backoff
  const retryWithBackoff = async (fn) => {
    let attempt = 0;
    while (attempt < maxRetries) {
      try {
        return await fn();
      } catch (error) {
        attempt++;
        if (attempt >= maxRetries) {
          throw new Error(`Failed after ${maxRetries} attempts: ${error.message}`);
        }
        const delay = initialDelay * Math.pow(2, attempt); // Exponential backoff
        core.debug(`Retrying... attempt ${attempt}. Retrying in ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay)); // Wait before retrying
      }
    }
  };

  const installer = getInstaller(options);
  let release;
  let version = options.version;

  if (version.toLowerCase() === 'git' || version.toLowerCase() === 'release') {
    // Wrap the getLatestRelease call in the retry logic
    release = await retryWithBackoff(() => installer.getLatestRelease());
    version = release.version;
  }

  const toolInstallDir = tc.find(options.toolCacheDir, version, options.arch);
  if (toolInstallDir) {
    core.info(`Using ffmpeg version ${version} from tool cache`);
    return {version, path: toolInstallDir, cacheHit: true};
  }

  if (!release) {
    // Wrap the getRelease call in the retry logic
    release = await retryWithBackoff(() => getRelease(installer, options));
  }

  core.info(`Installing ffmpeg version ${release.version} from ${release.downloadUrl}`);

  return {
    ...(await installer.downloadTool(release)),
    cacheHit: false,
  };
}
