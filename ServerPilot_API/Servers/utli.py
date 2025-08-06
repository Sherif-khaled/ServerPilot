def _parse_bandwidth(net_dev_start, net_dev_end):
    """Parse the output of /proc/net/dev to get bandwidth in Mbps."""
    def get_bytes(output):
        rx_total, tx_total = 0, 0
        lines = output.strip().split('\n')[2:]  # Skip header lines
        for line in lines:
            if ':' in line:
                parts = line.split(':')[1].split()
                rx_total += int(parts[0])
                tx_total += int(parts[8])
        return rx_total, tx_total

    try:
        rx_start, tx_start = get_bytes(net_dev_start)
        rx_end, tx_end = get_bytes(net_dev_end)

        # Bytes per second, then convert to Megabits per second
        rx_mbps = (rx_end - rx_start) * 8 / (1024 * 1024)
        tx_mbps = (tx_end - tx_start) * 8 / (1024 * 1024)

        return {'rx_mbps': round(rx_mbps, 2), 'tx_mbps': round(tx_mbps, 2)}
    except (IndexError, ValueError) as e:
        logger.warning(f"Could not parse /proc/net/dev output: {e}")
        return {'rx_mbps': 0, 'tx_mbps': 0}

def _parse_disk_io(iostat_output):
    """Parse the output of iostat to get disk I/O stats in MB/s."""
    lines = iostat_output.strip().split('\n')
    read_mbps, write_mbps = 0.0, 0.0
    # The second report is the one we want, so find the second 'Device' header
    try:
        device_header_index = [i for i, line in enumerate(lines) if line.startswith('Device')][1]
        stats_lines = lines[device_header_index + 1:]
        for line in stats_lines:
            parts = line.split()
            if parts:
                # kBytes_read/s is at index 2, kBytes_wrtn/s is at index 3
                read_mbps += float(parts[2]) / 1024
                write_mbps += float(parts[3]) / 1024
    except (IndexError, ValueError) as e:
        logger.warning(f"Could not parse iostat output: {e}")
        return {'read_mbps': 0, 'write_mbps': 0}

    return {'read_mbps': round(read_mbps, 2), 'write_mbps': round(write_mbps, 2)}