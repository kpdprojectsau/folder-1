/* global CMS, createClass, h */
const ProjectPreview = createClass({
  render() {
    const entry = this.props.entry;
    const title = entry.getIn(["data", "title"]) || "Untitled project";
    const location = entry.getIn(["data", "location"]) || "Location not set";
    const category = entry.getIn(["data", "primary_category"]) || "Category not set";
    const summary = entry.getIn(["data", "summary"]) || "Add a short summary to preview this project.";
    const coverValue = entry.getIn(["data", "cover_image"]);
    const cover = coverValue ? this.props.getAsset(coverValue) : null;
    const gallery = entry.getIn(["data", "gallery"]);
    const galleryItems = gallery ? gallery.toArray() : [];

    return h("main", { className: "cms-preview" },
      cover ? h("img", { className: "cms-preview-cover", src: cover.toString(), alt: entry.getIn(["data", "cover_alt"]) || "" }) : null,
      h("div", { className: "cms-preview-copy" },
        h("p", { className: "cms-preview-kicker" }, `${category} · ${location}`),
        h("h1", {}, title),
        h("p", {}, summary),
        h("a", { href: "#", onClick: (event) => event.preventDefault() }, "View project →"),
      ),
      galleryItems.length ? h("section", { className: "cms-preview-gallery-section" },
        h("h2", {}, "Gallery preview"),
        h("div", { className: "cms-preview-gallery" }, ...galleryItems.map((photo, index) => {
          const image = photo.get("image");
          const asset = image ? this.props.getAsset(image) : null;
          return h("figure", { key: index },
            asset ? h("img", { src: asset.toString(), alt: photo.get("alt") || "" }) : null,
            photo.get("caption") ? h("figcaption", {}, photo.get("caption")) : null,
          );
        })),
      ) : null,
    );
  },
});

CMS.registerPreviewTemplate("projects", ProjectPreview);
CMS.registerPreviewStyle("/admin/preview.css?v=4");
