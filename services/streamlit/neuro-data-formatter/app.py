import io
import json
import pandas as pd
import numpy as np
import streamlit as st
from datetime import datetime
from io import BytesIO


st.set_page_config(page_title="Neuro Data Formatter", page_icon="📊", layout="wide")
st.title("📊 Neuro Data Formatter")
st.markdown("Convert CSV to NWB (Neurodata Without Borders) format with validation and preview")

# Sidebar - Configuration
st.sidebar.header("NWB Configuration")
nwb_version = st.sidebar.selectbox("NWB Version", ["2.0", "2.5"], index=1)
export_format = st.sidebar.selectbox("Export Format", ["NWB (HDF5)", "JSON Manifest", "Both"])

st.sidebar.header("Data Validation")
validate_timestamps = st.sidebar.checkbox("Validate timestamps", value=True)
check_missing_values = st.sidebar.checkbox("Check missing values", value=True)
auto_fix_issues = st.sidebar.checkbox("Auto-fix common issues", value=False)

st.sidebar.header("Preview Options")
preview_rows = st.sidebar.slider("Preview rows", 10, 100, 30, 10)
show_statistics = st.sidebar.checkbox("Show statistics", value=True)

# Main content
st.subheader("📁 Upload Data")

col_upload1, col_upload2 = st.columns([2, 1])

with col_upload1:
    uploaded_file = st.file_uploader(
        "Upload CSV file",
        type=["csv"],
        help="Upload a CSV file containing neural recording data"
    )

with col_upload2:
    st.markdown("**Example CSV Format:**")
    st.code("""time_ms,neuron_id,voltage_mv
0.0,1,-70.0
0.1,1,-69.5
0.2,1,-69.0
0.0,2,-70.0
0.1,2,-70.2""", language="csv")

# Example data generator
if st.button("📝 Generate Example Data"):
    # Create example data
    n_neurons = 5
    n_timepoints = 100
    dt = 0.1  # ms

    data = []
    for neuron_id in range(1, n_neurons + 1):
        for t_idx in range(n_timepoints):
            time_ms = t_idx * dt
            # Simulate membrane potential with noise
            voltage = -70.0 + np.random.randn() * 2.0
            # Add occasional spikes
            if np.random.rand() < 0.05:
                voltage = 30.0
            data.append({
                'time_ms': time_ms,
                'neuron_id': neuron_id,
                'voltage_mv': voltage,
                'current_na': np.random.randn() * 0.5 + 1.0
            })

    df_example = pd.DataFrame(data)
    csv_example = df_example.to_csv(index=False).encode('utf-8')

    st.download_button(
        label="📥 Download Example CSV",
        data=csv_example,
        file_name="example_neural_data.csv",
        mime="text/csv"
    )

if not uploaded_file:
    st.info("👆 Upload a CSV file or generate example data to get started")
    st.stop()

# Load and process data
try:
    raw = uploaded_file.read()
    df = pd.read_csv(io.BytesIO(raw))
    st.success(f"✅ Loaded {len(df)} rows, {len(df.columns)} columns")
except Exception as e:
    st.error(f"❌ Failed to load CSV: {str(e)}")
    st.stop()

# Data Preview
st.divider()
st.subheader("📋 Data Preview")

col_prev1, col_prev2 = st.columns([3, 1])

with col_prev1:
    st.dataframe(df.head(preview_rows), use_container_width=True)

with col_prev2:
    st.markdown("**Dataset Info**")
    st.metric("Total Rows", len(df))
    st.metric("Columns", len(df.columns))
    st.metric("Memory", f"{df.memory_usage(deep=True).sum() / 1024:.1f} KB")

# Statistics
if show_statistics:
    with st.expander("📈 Data Statistics"):
        st.dataframe(df.describe(), use_container_width=True)

# Column Mapping
st.divider()
st.subheader("🗂️ Column Mapping")

st.markdown("Map your CSV columns to NWB data fields:")

cols = ["(none)"] + list(df.columns)

col_map1, col_map2, col_map3 = st.columns(3)

with col_map1:
    st.markdown("**Required Fields**")
    time_col = st.selectbox("⏱️ Time column", options=cols[1:], index=0,
                           help="Column containing timestamps (required)")
    neuron_col = st.selectbox("🧠 Neuron/Unit ID", options=cols,
                             index=min(1, len(cols) - 1) if len(cols) > 1 else 0,
                             help="Column identifying individual neurons/units")

with col_map2:
    st.markdown("**Electrophysiology**")
    voltage_col = st.selectbox("⚡ Voltage/Membrane Potential", options=cols,
                              index=min(2, len(cols) - 1) if len(cols) > 2 else 0,
                              help="Membrane voltage measurements")
    current_col = st.selectbox("🔌 Current", options=cols, index=0,
                              help="Injected or measured current")

with col_map3:
    st.markdown("**Additional Data**")
    spike_col = st.selectbox("💥 Spike Events", options=cols, index=0,
                            help="Binary spike indicators (0/1)")
    custom_col = st.selectbox("📌 Custom Data", options=cols, index=0,
                             help="Any additional measurements")

# Metadata
st.divider()
st.subheader("📝 Experiment Metadata")

col_meta1, col_meta2 = st.columns(2)

with col_meta1:
    session_description = st.text_area(
        "Session Description",
        value="Neural recording session",
        help="Brief description of the recording session"
    )
    experimenter = st.text_input(
        "Experimenter Name",
        value="",
        help="Name of person who performed the experiment"
    )
    lab = st.text_input(
        "Lab/Institution",
        value="",
        help="Laboratory or institution name"
    )

with col_meta2:
    experiment_description = st.text_area(
        "Experiment Description",
        value="",
        help="Detailed description of the experiment"
    )
    session_id = st.text_input(
        "Session ID",
        value=f"session_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
        help="Unique identifier for this session"
    )
    subject_id = st.text_input(
        "Subject ID",
        value="",
        help="Identifier for the experimental subject"
    )

# Device information
with st.expander("🔬 Device & Recording Information"):
    col_dev1, col_dev2 = st.columns(2)

    with col_dev1:
        device_name = st.text_input("Device Name", value="Recording Device")
        device_description = st.text_area("Device Description", value="")
        electrode_group = st.text_input("Electrode Group", value="electrodes")

    with col_dev2:
        sampling_rate = st.number_input("Sampling Rate (Hz)", value=10000.0, min_value=1.0)
        recording_location = st.text_input("Recording Location", value="")
        notes = st.text_area("Additional Notes", value="")

# Validation
st.divider()
st.subheader("✅ Data Validation")

validation_errors = []
validation_warnings = []

# Check required fields
if time_col == "(none)":
    validation_errors.append("Time column is required")
else:
    # Validate time column
    try:
        time_data = pd.to_numeric(df[time_col], errors='coerce')
        if time_data.isna().any():
            validation_errors.append(f"Time column '{time_col}' contains non-numeric values")
        elif validate_timestamps:
            if not time_data.is_monotonic_increasing:
                validation_warnings.append("Time values are not monotonically increasing")
            if (time_data.diff()[1:] <= 0).any():
                validation_warnings.append("Time column contains duplicate or decreasing values")
    except Exception as e:
        validation_errors.append(f"Failed to validate time column: {str(e)}")

# Check for missing values
if check_missing_values:
    for col in [time_col, neuron_col, voltage_col, current_col, spike_col, custom_col]:
        if col != "(none)" and col in df.columns:
            missing_count = df[col].isna().sum()
            if missing_count > 0:
                pct = (missing_count / len(df)) * 100
                validation_warnings.append(f"Column '{col}' has {missing_count} missing values ({pct:.1f}%)")

# Check data ranges
if voltage_col != "(none)" and voltage_col in df.columns:
    try:
        voltage_data = pd.to_numeric(df[voltage_col], errors='coerce')
        v_min, v_max = voltage_data.min(), voltage_data.max()
        if v_min < -200 or v_max > 100:
            validation_warnings.append(f"Voltage values outside typical range: [{v_min:.1f}, {v_max:.1f}] mV")
    except:
        pass

# Display validation results
col_val1, col_val2 = st.columns(2)

with col_val1:
    if validation_errors:
        st.error("**Errors Found:**")
        for error in validation_errors:
            st.error(f"❌ {error}")
    else:
        st.success("✅ No critical errors found")

with col_val2:
    if validation_warnings:
        st.warning("**Warnings:**")
        for warning in validation_warnings:
            st.warning(f"⚠️ {warning}")
    else:
        st.success("✅ No warnings")

# Build manifest
manifest = {
    "format": "NWB",
    "version": nwb_version,
    "source_file": uploaded_file.name,
    "created": datetime.now().isoformat(),
    "metadata": {
        "session_description": session_description,
        "session_id": session_id,
        "experimenter": experimenter if experimenter else None,
        "lab": lab if lab else None,
        "experiment_description": experiment_description if experiment_description else None,
        "subject_id": subject_id if subject_id else None,
    },
    "device": {
        "name": device_name,
        "description": device_description if device_description else None,
        "sampling_rate_hz": sampling_rate,
        "location": recording_location if recording_location else None,
    },
    "column_mapping": {
        "time": time_col,
        "neuron_id": neuron_col if neuron_col != "(none)" else None,
        "voltage": voltage_col if voltage_col != "(none)" else None,
        "current": current_col if current_col != "(none)" else None,
        "spikes": spike_col if spike_col != "(none)" else None,
        "custom": custom_col if custom_col != "(none)" else None,
    },
    "data_summary": {
        "total_rows": int(len(df)),
        "columns": list(df.columns),
        "time_range": [float(df[time_col].min()), float(df[time_col].max())] if time_col != "(none)" else None,
    },
    "validation": {
        "errors": validation_errors,
        "warnings": validation_warnings,
    }
}

# Preview NWB structure
st.divider()
st.subheader("🔍 NWB Structure Preview")

with st.expander("View NWB Manifest (JSON)"):
    st.json(manifest)

# Data visualization
if time_col != "(none)" and voltage_col != "(none)" and voltage_col in df.columns:
    st.divider()
    st.subheader("📊 Data Visualization")

    try:
        # Prepare data for plotting
        plot_df = df[[time_col, voltage_col]].copy()
        if neuron_col != "(none)" and neuron_col in df.columns:
            plot_df['neuron'] = df[neuron_col]

        # Limit to reasonable number of points for plotting
        if len(plot_df) > 10000:
            plot_df = plot_df.iloc[::len(plot_df)//10000]
            st.info(f"Showing downsampled data ({len(plot_df)} points) for visualization")

        # Convert to numeric
        plot_df[time_col] = pd.to_numeric(plot_df[time_col], errors='coerce')
        plot_df[voltage_col] = pd.to_numeric(plot_df[voltage_col], errors='coerce')
        plot_df = plot_df.dropna()

        if neuron_col != "(none)" and neuron_col in df.columns:
            # Plot by neuron
            unique_neurons = plot_df['neuron'].unique()[:5]  # Limit to 5 neurons
            for neuron in unique_neurons:
                neuron_data = plot_df[plot_df['neuron'] == neuron]
                st.line_chart(neuron_data.set_index(time_col)[voltage_col])
        else:
            # Plot all data
            st.line_chart(plot_df.set_index(time_col)[voltage_col])

    except Exception as e:
        st.warning(f"Could not generate visualization: {str(e)}")

# Export section
st.divider()
st.subheader("💾 Export Data")

if validation_errors:
    st.error("⚠️ Cannot export: Please fix validation errors first")
else:
    col_exp1, col_exp2, col_exp3 = st.columns(3)

    with col_exp1:
        # Export manifest
        manifest_json = json.dumps(manifest, indent=2, ensure_ascii=False)
        st.download_button(
            label="📥 Download Manifest (JSON)",
            data=manifest_json.encode('utf-8'),
            file_name=f"nwb_manifest_{session_id}.json",
            mime="application/json",
            use_container_width=True,
            help="Download metadata and mapping information"
        )

    with col_exp2:
        # Export processed CSV
        processed_df = df.copy()
        if auto_fix_issues and time_col != "(none)":
            # Sort by time
            processed_df = processed_df.sort_values(by=time_col)

        csv_processed = processed_df.to_csv(index=False).encode('utf-8')
        st.download_button(
            label="📥 Download Processed CSV",
            data=csv_processed,
            file_name=f"processed_{uploaded_file.name}",
            mime="text/csv",
            use_container_width=True,
            help="Download cleaned and validated CSV"
        )

    with col_exp3:
        # NWB export placeholder
        if st.button("🔄 Generate NWB File", use_container_width=True, type="primary"):
            st.info("""
            **NWB Generation**

            Full NWB file generation requires `pynwb` library.

            To generate NWB files:
            1. Install: `pip install pynwb`
            2. Use the manifest JSON to create NWB structure
            3. Add TimeSeries, Units, and ElectricalSeries data

            Example code:
            ```python
            from pynwb import NWBFile, NWBHDF5IO
            from pynwb.ecephys import TimeSeries
            from datetime import datetime

            nwbfile = NWBFile(
                session_description=manifest['metadata']['session_description'],
                identifier=manifest['metadata']['session_id'],
                session_start_time=datetime.now()
            )

            # Add time series data
            ts = TimeSeries(
                name='voltage',
                data=voltage_data,
                timestamps=time_data,
                unit='mV'
            )
            nwbfile.add_acquisition(ts)

            # Write to file
            with NWBHDF5IO('output.nwb', 'w') as io:
                io.write(nwbfile)
            ```
            """)

# Help section
st.divider()

with st.expander("ℹ️ Help & Documentation"):
    st.markdown("""
    ### About NWB Format

    **Neurodata Without Borders (NWB)** is a standardized format for neurophysiology data.

    ### Supported Data Types
    - **TimeSeries**: Continuous voltage/current recordings
    - **Units**: Spike times and neuron metadata
    - **ElectricalSeries**: Multi-electrode recordings
    - **SpatialSeries**: Position tracking data

    ### Column Mapping Guide

    **Time Column**: Must contain numeric timestamps (seconds or milliseconds)
    **Neuron ID**: Integer or string identifier for each neuron/unit
    **Voltage**: Membrane potential measurements (typically in mV)
    **Current**: Injected or measured current (typically in nA or pA)
    **Spikes**: Binary (0/1) or spike times

    ### Best Practices

    1. **Consistent Units**: Use consistent units throughout (document in metadata)
    2. **Monotonic Time**: Ensure timestamps are increasing
    3. **Complete Metadata**: Fill in all relevant metadata fields
    4. **Validation**: Always validate data before export
    5. **Documentation**: Include detailed experiment description

    ### Common Issues

    - **Non-numeric time**: Ensure time column contains only numbers
    - **Missing values**: Handle or document missing data
    - **Large files**: Consider downsampling for very large datasets
    - **Mixed units**: Ensure consistent units across measurements

    ### Resources

    - [NWB Documentation](https://nwb-overview.readthedocs.io/)
    - [PyNWB Tutorial](https://pynwb.readthedocs.io/)
    - [NWB Schema](https://nwb-schema.readthedocs.io/)
    """)

# Footer
st.divider()
st.caption("Neuro Data Formatter v1.0 | NWB 2.0+ Compatible | For full NWB export, install pynwb")
