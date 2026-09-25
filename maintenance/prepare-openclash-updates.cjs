// Offline candidate builder: no downloads, writes, cron installation or restart.
const fs = require('node:fs');
const crypto = require('node:crypto');
const LIMIT = 512 * 1024;
const TYPES = [['geo', 'ipdb'], ['geosite', 'geosite'], ['geoip', 'geoip'], ['geoasn', 'geoasn']];
const geoRows = TYPES.map(([prefix, type]) =>
  `      [ "$(uci_get_config "${prefix}_auto_update")" -eq 1 ] && echo "0 $(uci_get_config "${prefix}_update_day_time" || 1) * * $(uci_get_config "${prefix}_update_week_time" || 0) /usr/share/openclash/openclash_geo.sh ${type} #openclash-cron-task" >> $CRON_FILE\n`);
const GEO_OLD = '   [ -z "$(grep "openclash_geo.sh" "$CRON_FILE" 2>/dev/null)" ] && {\n' + geoRows.join('') + '   }\n';
const GEO_NEW = geoRows.map((row, index) =>
  `   [ -z "$(grep -F "/usr/share/openclash/openclash_geo.sh ${TYPES[index][1]} #openclash-cron-task" "$CRON_FILE" 2>/dev/null)" ] && {\n${row}   }\n`).join('');
const CURL_ANCHOR = '    if ! mv -f "$DOWNLOAD_TMP" "$DOWNLOAD_PATH"; then\n';
// Only in-place downloads (the overwrite cron caller) get this behavior.
// Separate download/installed paths, including GEO/CHNRoute, retain native handling.
const CURL_GUARD = `    # Local maintenance: unchanged in-place HTTP 200 download is a no-op.
    if [ "$DOWNLOAD_PATH" = "$FILE_PATH" ] && [ -f "$FILE_PATH" ]; then
        cmp -s "$DOWNLOAD_TMP" "$FILE_PATH"
        CONTENT_COMPARE_STATUS=$?
        if [ "$CONTENT_COMPARE_STATUS" -eq 0 ]; then
            rm -f "$HEADER_TMP" "$DOWNLOAD_TMP"
            return 2
        elif [ "$CONTENT_COMPARE_STATUS" -ne 1 ]; then
            LOG_OUT "Download comparison failed; existing file preserved."
            rm -f "$HEADER_TMP" "$DOWNLOAD_TMP"
            return 1
        fi
    fi

`;
function prepare(input, expectedHash, kind) {
  const bytes = Buffer.isBuffer(input) ? input : Buffer.from(input);
  if (bytes.length > LIMIT) throw Error('input exceeds 512 KiB');
  if (!/^[a-f0-9]{64}$/.test(expectedHash) || crypto.createHash('sha256').update(bytes).digest('hex') !== expectedHash) throw Error('reviewed input hash mismatch');
  const original = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  if (!Buffer.from(original).equals(bytes)) throw Error('noncanonical UTF-8 input');
  let before, after;
  if (kind === 'geo') { before = GEO_OLD; after = GEO_NEW; }
  else if (kind === 'overwrite') {
    if (original.includes('CONTENT_COMPARE_STATUS')) throw Error('already patched');
    before = CURL_ANCHOR; after = CURL_GUARD + CURL_ANCHOR;
  } else throw Error('kind must be geo or overwrite');
  if (original.split(before).length !== 2) throw Error('unknown or ambiguous source layout');
  return original.replace(before, after);
}
if (require.main === module) {
  try {
    if (process.argv.length !== 4) throw Error('usage: node prepare-openclash-updates.cjs geo|overwrite REVIEWED_SHA256 < reviewed.before > candidate');
    const buffer = Buffer.alloc(LIMIT + 1); let size = 0, count;
    while (size < buffer.length && (count = fs.readSync(0, buffer, size, buffer.length - size, null))) size += count;
    process.stdout.write(prepare(buffer.subarray(0, size), process.argv[3], process.argv[2]));
  } catch (error) { process.stderr.write(error.message + '\n'); process.exitCode = 1; }
}
module.exports = { prepare };
