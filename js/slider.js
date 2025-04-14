document.addEventListener("DOMContentLoaded", () => {
    const sliderToggle = document.getElementById("sliderToggle");
    const sdLabel = document.getElementById("sdLabel");
    const hdLabel = document.getElementById("hdLabel");
    const sliderToggleFormat = document.getElementById("sliderToggleFormat");
    const pdfLabel = document.getElementById("pdfLabel");
    const pptxLabel = document.getElementById("pptxLabel");

    sliderToggle.checked = false;
    sliderToggleFormat.checked = false;

    sdLabel.style.color = "#5fdd54";
    hdLabel.style.color = "#ffffff";
    pdfLabel.style.color = "#5fdd54";
    pptxLabel.style.color = "#ffffff";

    sliderToggle.addEventListener("change", () => {
        if (sliderToggle.checked) {
            sdLabel.style.color = "#ffffff";
            hdLabel.style.color = "#5fdd54";
        } else {
            sdLabel.style.color = "#5fdd54";
            hdLabel.style.color = "#ffffff";
        }
    });

    sliderToggleFormat.addEventListener("change", () => {
        if (sliderToggleFormat.checked) {
            pdfLabel.style.color = "#ffffff";
            pptxLabel.style.color = "#5fdd54";
        } else {
            pdfLabel.style.color = "#5fdd54";
            pptxLabel.style.color = "#ffffff";
        }
    });
});